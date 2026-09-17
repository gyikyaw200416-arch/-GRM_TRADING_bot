import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

// Initialize Bot & Supabase safely
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
    console.error("Photo reply error:", error);
    await ctx.reply(captionText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }

  // 2. Referral Logic (Refer link နဲ့ဝင်လာတာကို စစ်ဆေးပြီး Supabase ထဲ မှတ်သားခြင်း)
  try {
    if (ctx.from) {
      const telegramUser = ctx.from;
      const rawUserId = telegramUser.id.toString();
      const userId = 'tg_' + rawUserId;
      const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
      
      // Grammy မှာ start command ရဲ့ payload (ref ID) ကို ctx.match နဲ့ ဖမ်းပါတယ်
      const startPayload = ctx.match; 

      // Check if user already exists in database
      let { data: existingUser } = await supabase
        .from('grm_users')
        .select('user_id, referrer_id')
        .eq('user_id', userId)
        .maybeSingle();

      // အကယ်၍ User က Database ထဲမှာ မရှိသေးရင် (လူသစ်စစ်စစ် ဖြစ်မှသာ Refer သတ်မှတ်မည်)
      if (!existingUser) {
        let assignedReferrerId = null;

        if (startPayload && typeof startPayload === 'string' && startPayload.trim() !== '') {
          let refRaw = startPayload.trim();
          let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
          
          // ကိုယ့်လင့် ကိုယ်ပြန်နှိပ်တာကို ကာကွယ်ရန်
          if (refParsed !== userId) {
            assignedReferrerId = refParsed;
          }
        }

        // 1. Insert new user to grm_users table
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

        // 2. If referrer exists, record history in grm_referrals and notify owner
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

            // Notify Referrer owner about who joined
            let targetChatId = assignedReferrerId.replace('tg_', '').replace('user_', '');
            await bot.api.sendMessage(
              targetChatId,
              `✅ *New Referral Joined!* 🎉\n\n👤 *User:* ${username}\n🆔 *ID:* \`${rawUserId}\`\n\n🎁 Check your Mini App Friends section to see the history!`,
              { parse_mode: 'Markdown' }
            ).catch((e) => console.log('Notification error:', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral processing background error:', err);
  }
});

bot.on("message", async (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith("/")) {
    await ctx.reply("Please type /start to open the GRAM Mining bot.");
  }
});

// Vercel Serverless Webhook Handler (Removed bot.init() to prevent timeout)
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
