import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Bot ကို Vercel မှာ Error မတက်အောင် ကြိုတင် Initialize လုပ်ရန်
let isInitialized = false;
async function ensureInit() {
  if (!isInitialized) {
    await bot.init();
    isInitialized = true;
  }
}

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

  // 1. Bot က စာနဲ့ ပုံကို အရင်ဆုံး ချက်ချင်းပြန်ပါမယ်
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

  // 2. Referral Logic (Database မှတ်တမ်းစစ်ဆေးခြင်းနဲ့ History သိမ်းခြင်း)
  try {
    if (ctx.from) {
      const telegramUser = ctx.from;
      const rawUserId = telegramUser.id.toString();
      const userId = 'tg_' + rawUserId;
      const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
      const startPayload = ctx.match; // Refer ID from link

      // Database ထဲမှာ User ရှိပြီးသားလား စစ်ဆေးရန်
      let { data: existingUser } = await supabase
        .from('grm_users')
        .select('user_id, referrer_id')
        .eq('user_id', userId)
        .maybeSingle();

      // အကယ်၍ User က Database ထဲမှာ မရှိသေးမှသာ (လူသစ်စစ်စစ်) Refer ကို သတ်မှတ်ပါမည်
      if (!existingUser) {
        let assignedReferrerId = null;

        if (startPayload && typeof startPayload === 'string' && startPayload.trim() !== '') {
          let refRaw = startPayload.trim();
          let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
          
          if (refParsed !== userId) {
            assignedReferrerId = refParsed;
          }
        }

        // grm_users ထဲသို့ User အသစ် ထည့်သွင်းခြင်း
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

        // Referrer ရှိရင် grm_referrals ထဲမှာ History သိမ်းပြီး ပိုင်ရှင်ကို အကြောင်းကြားမည်
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

            // Notify Referrer owner
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
    console.error('Referral processing error:', err);
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
      await ensureInit(); // Bot ကို ပုံမှန်အလုပ်လုပ်နိုင်ရန် အမြဲစစ်ဆေးပေးပါမည်
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Bot update error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(200).send("Telegram bot server is running!");
}
