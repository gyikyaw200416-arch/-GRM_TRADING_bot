import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "";
    const payload = ctx.match;

    // 1. Check user in Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingUser) {
      let invitedBy = null;
      if (payload && !isNaN(payload) && Number(payload) !== userId) {
        invitedBy = Number(payload);
        await supabase.rpc("increment_balance", { user_id: invitedBy, amount: 100 });
      }

      await supabase.from("users").insert([
        {
          id: userId,
          username: username,
          balance: 50,
          invited_by: invitedBy,
          verified: false
        }
      ]);
    }

    // 2. Welcome UI & Buttons
    const keyboard = new InlineKeyboard()
      .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
      .row()
      .url("🌐 Community", "https://t.me/AI_TRADING_FOREX");

    const photoUrl = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop";

    const captionText = 
      `👋 *Welcome to TRADING_GRAM!*\n\n` +
      `⛏ Mine tokens directly to your Pool Wallet.\n` +
      `⚡ Tap to boost mining speed!\n` +
      `🔗 Connect your TON wallet.\n` +
      `💰 GRM to upgrade your miner level!\n\n` +
      `👤 Your ID: \`${userId}\`\n\n` +
      `Click below to start.`;

    await ctx.replyWithPhoto(photoUrl, {
      caption: captionText,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

  } catch (error) {
    console.error("Start command error:", error);
    const userId = ctx.from?.id || "Unknown";
    const fallbackKeyboard = new InlineKeyboard()
      .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/");

    await ctx.reply(`👋 *Welcome to TRADING_GRAM!*\n\nClick below to start mining.\n\n👤 Your ID: \`${userId}\``, {
      parse_mode: "Markdown",
      reply_markup: fallbackKeyboard
    });
  }
});

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error("Webhook handle error:", err);
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send("TRADING_GRAM Bot is running successfully!");
}
