import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function callTelegramAPI(method, payload) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (err) {
    console.error("Telegram API Error:", err);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const urlPath = req.url || '';

    // ==========================================
    // 1. API Endpoint for Multi-Account Verification
    // ==========================================
    if (urlPath.includes('/api/verify-user') || req.method === 'POST' && req.body && req.body.telegram_id && req.body.device_hash) {
      if (req.method !== "POST") {
        return res.status(405).json({ status: "ERROR", message: "Method not allowed" });
      }

      const { telegram_id, device_hash } = req.body;

      if (!telegram_id || !device_hash) {
        return res.status(400).json({ 
          status: "ERROR", 
          message: "Incomplete data provided." 
        });
      }

      // Get client IP address
      const clientIp = req.headers['cf-connecting-ip'] || 
                       req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                       req.socket.remoteAddress;

      // Check if another user account already exists with the same IP or Device Hash
      const { data: existingUsers, error: checkError } = await supabase
        .from('grm_users')
        .select('user_id')
        .or(`ip_address.eq.${clientIp},device_hash.eq.${device_hash}`)
        .neq('user_id', telegram_id)
        .limit(1);

      if (checkError) throw checkError;

      // If a duplicate is found, block the user
      if (existingUsers && existingUsers.length > 0) {
        await supabase
          .from('grm_users')
          .update({ 
            ip_address: clientIp, 
            device_hash: device_hash, 
            is_blocked: true 
          })
          .eq('user_id', telegram_id);

        return res.json({
          status: "BLOCKED",
          message: "Multi-Account Detected! Multiple accounts are not allowed on the same device or IP address."
        });
      }

      // Otherwise, update the user record normally and allow access
      await supabase
        .from('grm_users')
        .update({ 
          ip_address: clientIp, 
          device_hash: device_hash, 
          is_blocked: false 
        })
        .eq('user_id', telegram_id);

      return res.json({ 
        status: "ALLOWED", 
        message: "Verification successful." 
      });
    }

    // ==========================================
    // 2. Telegram Bot Webhook Handler (/start & messages)
    // ==========================================
    if (req.method !== "POST") {
      return res.status(200).send("Telegram bot server is running!");
    }

    let update = req.body;
    if (typeof update === "string") {
      try {
        update = JSON.parse(update);
      } catch (e) {}
    }

    if (update && update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text.startsWith("/start")) {
        const telegramUser = update.message.from;
        const rawUserId = telegramUser.id.toString();
        const userId = 'tg_' + rawUserId;
        const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
        
        const parts = text.split(" ");
        const startPayload = parts.length > 1 ? parts[1].trim() : null;

        const captionText = 
          "👋 *Welcome to GRAM Mining Core!*\n\n" +
          "✈ *Mine GRAM tokens directly to your Pool Wallet.*\n" +
          "⚡ *Tap to boost mining speed!*\n" +
          "🔗 *Connect your TON wallet.*\n" +
          "💰 *GRAM to upgrade your miner level!*\n\n" +
          "Click below to start.";

        const replyMarkup = {
          inline_keyboard: [
            [{ text: "🚀 Start Mining", web_app: { url: "https://grm-trading-bot.vercel.app/" } }],
            [{ text: "🌐 Community", url: "https://discord.gg/NwsPcvukX" }]
          ]
        };

        // 1. Send Photo with Caption and Buttons
        const photoResult = await callTelegramAPI("sendPhoto", {
          chat_id: chatId,
          photo: "AgACAgUAAxkBAAIBNGqi2DLQ5k1Da8CwjDq78x-ymAbrAAJOE2sb384YVfji7oChJMUsAQADAgADeQADPQQ",
          caption: captionText,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });

        // If photo sending fails (e.g. invalid File ID), fallback to sendMessage
        if (!photoResult || !photoResult.ok) {
          await callTelegramAPI("sendMessage", {
            chat_id: chatId,
            text: captionText,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
          });
        }

        // 2. Background Database & Referral Process
        (async () => {
          try {
            let { data: existingUser } = await supabase
              .from('grm_users')
              .select('user_id, referrer_id')
              .eq('user_id', userId)
              .maybeSingle();

            if (!existingUser) {
              let assignedReferrerId = null;

              if (startPayload && startPayload !== '') {
                let refParsed = startPayload.startsWith('tg_') ? startPayload : 'tg_' + startPayload;
                if (refParsed !== userId) {
                  assignedReferrerId = refParsed;
                }
              }

              await supabase.from('grm_users').upsert([{
                user_id: userId,
                username: username,
                referrer_id: assignedReferrerId,
                balance: 0,
                mined_amount: 0,
                mining_state: 'stopped',
                level: 0,
                is_verified: false,
                updated_at: new Date().toISOString()
              }], { onConflict: 'user_id' });

              if (assignedReferrerId) {
                const refRelationId = 'ref_' + rawUserId;
                
                let { data: existingRef } = await supabase
                  .from('grm_referrals')
                  .select('*')
                  .eq('id', refRelationId)
                  .maybeSingle();

                if (!existingRef) {
                  await supabase.from('grm_referrals').upsert([{
                    id: refRelationId,
                    referrer_id: assignedReferrerId,
                    referred_id: userId,
                    status: 'active',
                    created_at: new Date().toISOString()
                  }], { onConflict: 'id' });

                  let targetChatId = assignedReferrerId.replace('tg_', '').replace('user_', '');
                  await callTelegramAPI("sendMessage", {
                    chat_id: targetChatId,
                    text: `✅ *New Referral Joined!* 🎉\n\n👤 *User:* ${username}\n🆔 *ID:* \`${rawUserId}\`\n\n🎁 Check your Mini App Friends section to see the history!`,
                    parse_mode: 'Markdown'
                  });
                }
              }
            }
          } catch (dbErr) {
            console.error("Database referral error:", dbErr);
          }
        })();
      } else {
        await callTelegramAPI("sendMessage", {
          chat_id: chatId,
          text: "Please type /start to open the GRAM Mining bot."
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(200).json({ error: error.message });
  }
}
