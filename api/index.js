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
  // CORS headers for admin/mini-app requests if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let bodyData = req.body;
    if (typeof bodyData === "string") {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {}
    }

    // --- ADMIN PANEL REFERRAL CLAIM COUNT UPDATE HANDLER ---
    // Handles requests coming from Admin Panel to update max_reward_limit safely (Integer instead of Boolean)
    if (bodyData && (bodyData.action === "update_claim_count" || bodyData.max_reward_limit !== undefined || bodyData.claim_count !== undefined)) {
      const targetUserId = bodyData.user_id ? (bodyData.user_id.toString().startsWith('tg_') ? bodyData.user_id : 'tg_' + bodyData.user_id) : null;
      const newLimit = parseInt(bodyData.max_reward_limit || bodyData.claim_count || 100, 10);

      if (!targetUserId) {
        return res.status(400).json({ ok: false, error: "Missing user_id for claim count update" });
      }

      // Update max_reward_limit as an integer in grm_users table
      const { data, error } = await supabase
        .from('grm_users')
        .update({ max_reward_limit: newLimit })
        .eq('user_id', targetUserId)
        .select();

      if (error) {
        console.error("Admin claim count update error:", error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, message: "Claim count updated successfully", data });
    }

    // --- TELEGRAM BOT WEBHOOK HANDLER ---
    if (bodyData && bodyData.message && bodyData.message.text) {
      const chatId = bodyData.message.chat.id;
      const text = bodyData.message.text.trim();

      if (text.startsWith("/start")) {
        const telegramUser = bodyData.message.from;
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

        const photoResult = await callTelegramAPI("sendPhoto", {
          chat_id: chatId,
          photo: "AgACAgUAAxkBAAIBNGqi2DLQ5k1Da8CwjDq78x-ymAbrAAJOE2sb384YVfji7oChJMUsAQADAgADeQADPQQ",
          caption: captionText,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });

        if (!photoResult || !photoResult.ok) {
          await callTelegramAPI("sendMessage", {
            chat_id: chatId,
            text: captionText,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
          });
        }

        // Background Database & Referral Process
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
                max_reward_limit: 1, // Default initial limit
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
