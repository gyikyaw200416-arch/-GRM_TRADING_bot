import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const telegramUser = ctx.from;
    const rawUserId = telegramUser.id.toString();
    const userId = 'tg_' + rawUserId;
    const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
    
    // grammy မှာ match က start command ရဲ့ payload (ref id) ကို ဖမ်းပေးပါတယ်
    const startPayload = ctx.match; 

    // 1. Check or Insert User into Supabase & Process Referral
    let { data: existingUser } = await supabase
      .from('grm_users')
      .select('user_id, referrer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let assignedReferrerId = null;
    if (startPayload && startPayload.trim() !== '') {
      let refRaw = startPayload.trim();
      let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
      if (refParsed !== userId) {
        assignedReferrerId = refParsed;
      }
    }

    if (!existingUser) {
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
    } else if (!existingUser.referrer_id && assignedReferrerId) {
      await supabase.from('grm_users')
        .update({ referrer_id: assignedReferrerId, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

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

        // Notify Referrer via Telegram Bot
        let targetChatId = assignedReferrerId.replace('tg_', '').replace('user_', '');
        await bot.api.sendMessage(
          targetChatId,
          `✅ *New Referral Joined!* 🎉\n\n👤 *Username:* ${username}\n🆔 *ID:* \`${rawUserId}\``,
          { parse_mode: 'Markdown' }
        ).catch((e) => console.log('Notification failed:', e.message));
      }
    }

    // 2. Original Keyboard & UI Responses
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

  } catch (err) {
    console.error('Error in referral / start logic:', err);
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
      await bot.init();
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Bot update error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(200).send("Telegram bot server is running!");
}
