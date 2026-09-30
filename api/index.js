import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";
const MINI_APP_URL = "https://grm-trading-bot.vercel.app/";
const COMMUNITY_URL = "https://discord.gg/NwsPcvukX";

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

    // --- GAME START HANDLER (Deduct 10 GRM) ---
    if (bodyData && bodyData.action === "start_game") {
      const rawUserId = bodyData.user_id;
      if (!rawUserId) {
        return res.status(400).json({ ok: false, error: "Missing user_id for game start" });
      }
      const userId = rawUserId.toString().startsWith('tg_') ? rawUserId : 'tg_' + rawUserId;

      const { data: user, error: fetchError } = await supabase
        .from('grm_users')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (fetchError || !user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      if ((user.balance || 0) < 10) {
        return res.status(400).json({ ok: false, error: "Insufficient balance (Need 10 GRM)" });
      }

      const newBalance = user.balance - 10;

      const { error: updateError } = await supabase
        .from('grm_users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        return res.status(500).json({ ok: false, error: updateError.message });
      }

      return res.status(200).json({ ok: true, message: "10 GRM deducted successfully", balance: newBalance });
    }

    // --- GAME WIN HANDLER (Add 20 GRM to Winner) ---
    if (bodyData && bodyData.action === "win_game") {
      const rawUserId = bodyData.user_id;
      if (!rawUserId) {
        return res.status(400).json({ ok: false, error: "Missing user_id for game win" });
      }
      const userId = rawUserId.toString().startsWith('tg_') ? rawUserId : 'tg_' + rawUserId;

      const { data: user, error: fetchError } = await supabase
        .from('grm_users')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (fetchError || !user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      const newBalance = (user.balance || 0) + 20;

      const { error: updateError } = await supabase
        .from('grm_users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        return res.status(500).json({ ok: false, error: updateError.message });
      }

      return res.status(200).json({ ok: true, message: "20 GRM added to winner balance", balance: newBalance });
    }

    // --- ADMIN PANEL REFERRAL CLAIM COUNT UPDATE HANDLER ---
    if (bodyData && (bodyData.action === "update_claim_count" || bodyData.max_reward_limit !== undefined || bodyData.claim_count !== undefined)) {
      const targetUserId = bodyData.user_id ? (bodyData.user_id.toString().startsWith('tg_') ? bodyData.user_id : 'tg_' + bodyData.user_id) : null;
      const newLimit = parseInt(bodyData.max_reward_limit || bodyData.claim_count || 100, 10);

      if (!targetUserId) {
        return res.status(400).json({ ok: false, error: "Missing user_id for claim count update" });
      }

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
          "⛏ *Welcome to GRAM Mining Core!*\n\n" +
          "📉 *Mine GRAM tokens directly to your Pool Wallet.*\n" +
          "⚡ *Tap to boost mining speed!*\n" +
          "🔗 *Connect your TON wallet.*\n" +
          "💰 *GRAM to upgrade your miner level!*\n\n" +
          "*Click below to start.*";

        const replyMarkup = {
          inline_keyboard: [
            [{ text: '🚀 Start Mining', web_app: { url: MINI_APP_URL } }],
            [{ text: '🌐 Community', url: COMMUNITY_URL }]
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
                max_reward_limit: 1,
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
