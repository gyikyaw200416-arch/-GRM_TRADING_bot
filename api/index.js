import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "";

    // 1. Check user in Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users").insert([
        {
          id: userId,
          username: username,
          balance: 50,
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
      `👤 Your ID: \`${userId}\`\n\n` +
      `Click below to start.`;

    await ctx.replyWithPhoto(photoUrl, {
      caption: captionText,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

  } catch (error) {
    console.error("Start error:", error);
    await ctx.reply("Welcome to TRADING_GRAM! Tap below to start mining.", {
      reply_markup: new InlineKeyboard().web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
    });
  }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error("Webhook error:", err);
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send("Bot is running!");
}
