import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

// Hardcoded Credentials
const BOT_TOKEN = "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = "https://uyblmdckdvqgammrfati.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";

const bot = new Bot(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
    .row()
    .url("🌐 Community", "https://discord.gg/NwsPcvukX");

  const captionText = 
    "👋 *Welcome to GRAM Mining Core!*\n\n" +
    "✈ *Mine GRAM tokens directly to your Pool Wallet.*\n" +
    "⚡ *Tap to boost mining speed!*\n" +
    "🔗 *Connect your TON wallet.*\n" +
    "💰 *GRAM to upgrade your miner level!*\n\n" +
    "Click below to start.";

  // 1. Bot က စာနဲ့ပုံကို အရင်ဆုံး ချက်ချင်းပြန်ပါမယ် (ဒီတော့ Bot က အမြဲ အလုပ်လုပ်နေပါမယ်)
  try {
    await ctx.replyWithPhoto(
      "AgACAgUAAxkBAAIBNGqi2DLQ5k1Da8CwjDq78x-ymAbrAAJOE2sb384YVfji7oChJMUsAQADAgADeQADPQQ",
      {
        caption: captionText,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error sending photo:", error);
    await ctx.reply(captionText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }

  // 2. Referral & Database Logic (Background မှာ အလုပ်လုပ်ပြီး Bot ကို Error မတက်စေရန်)
  try {
    if (ctx.from) {
      const telegramUser = ctx.from;
      const rawUserId = telegramUser.id.toString();
      const userId = 'tg_' + rawUserId;
      const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
      const startPayload = ctx.match; // Extracts referral payload

      let { data: existingUser } = await supabase
        .from('grm_users')
        .select('user_id, referrer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingUser) {
        let assignedReferrerId = null;

        if (startPayload && typeof startPayload === 'string' && startPayload.trim() !== '') {
          let refRaw = startPayload.trim();
          let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
          
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
            await bot.api.sendMessage(
              targetChatId,
              `✅ *New Referral Joined!* 🎉\n\n👤 *User:* ${username}\n🆔 *ID:* \`${rawUserId}\`\n\n🎁 Check your Mini App Friends section to see the history!`,
              { parse_mode: 'Markdown' }
            ).catch((e) => console.log('Notification failed:', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral logic error (non-fatal):', err);
  }
});

bot.on("message", async (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith("/")) {
    await ctx.reply("Please type /start to open the GRAM Mining bot.");
  }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Bot update error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(200).send("Telegram bot server is running!");
}
