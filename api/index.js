import { createClient } from "@supabase/supabase-js";

// Hardcoded Credentials
const BOT_TOKEN = "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
// FIXED: Removed "/rest/v1/" from the end of the Supabase URL so the client connects properly
const SUPABASE_URL = "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to send Telegram API requests directly
async function callTelegramAPI(method, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram bot server is running!");
  }

  try {
    const update = req.body;

    // Check if it's a message containing /start
    if (update && update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text.startsWith("/start")) {
        const telegramUser = update.message.from;
        const rawUserId = telegramUser.id.toString();
        const userId = 'tg_' + rawUserId;
        const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
        
        // Extract referral payload (e.g., "/start tg_12345" -> "tg_12345")
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

        // 1. Send Photo & Caption instantly to the user
        await callTelegramAPI("sendPhoto", {
          chat_id: chatId,
          photo: "AgACAgUAAxkBAAIBNGqi2DLQ5k1Da8CwjDq78x-ymAbrAAJOE2sb384YVfji7oChJMUsAQADAgADeQADPQQ",
          caption: captionText,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });

        // 2. Process Referral & Database Logic safely in the background
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
      } else {
        // Handle other messages
        await callTelegramAPI("sendMessage", {
          chat_id: update.message.chat.id,
          text: "Please type /start to open the GRAM Mining bot."
        });
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message });
  }
}
