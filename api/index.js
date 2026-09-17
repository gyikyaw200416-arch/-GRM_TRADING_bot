import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Pre-initialize bot to prevent Vercel timeout issues
let isBotInitialized = false;
async function ensureBotInit() {
  if (!isBotInitialized) {
    await bot.init();
    isBotInitialized = true;
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

  // 1. Safe Referral Processing (Runs independently so it never blocks the bot response)
  try {
    if (supabase && ctx.from) {
      const telegramUser = ctx.from;
      const rawUserId = telegramUser.id.toString();
      const userId = 'tg_' + rawUserId;
      const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
      const startPayload = ctx.match; // Referral ID payload

      // Check if user already exists
      let { data: existingUser } = await supabase
        .from('grm_users')
        .select('user_id, referrer_id')
        .eq('user_id', userId)
        .maybeSingle();

      let assignedReferrerId = null;

      // If user is brand new (not in database yet)
      if (!existingUser) {
        if (startPayload && typeof startPayload === 'string' && startPayload.trim() !== '') {
          let refRaw = startPayload.trim();
          let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
          
          if (refParsed !== userId) {
            assignedReferrerId = refParsed;
          }
        }

        // Insert new user into grm_users
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

        // Record referral history if a valid referrer exists
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
              `✅ *New Referral Joined!* 🎉\n\n👤 *User:* ${username}\n🆔 *ID:* \`${rawUserId}\``,
              { parse_mode: 'Markdown' }
            ).catch((e) => console.log('Notification failed:', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral logic error (non-fatal):', err);
  }

  // 2. Guaranteed UI Response
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
});

bot.on("message", async (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith("/")) {
    await ctx.reply("Please type /start to open the GRAM Mining bot.");
  }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await ensureBotInit();
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Bot update error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(200).send("Telegram bot server is running!");
}
