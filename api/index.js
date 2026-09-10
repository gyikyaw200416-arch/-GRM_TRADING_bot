import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "";

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users").insert([
        { id: userId, username: username, balance: 50, verified: false }
      ]);
    }

    const keyboard = new InlineKeyboard()
      .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/");

    await ctx.replyWithPhoto("https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop", {
      caption: `👋 *Welcome to TRADING_GRAM!*\n\n⛏ Tap below to start mining.\n👤 Your ID: \`${userId}\``,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    console.error("Start error:", error);
    await ctx.reply("Welcome! Click below to start mining.", {
      reply_markup: new InlineKeyboard().web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
    });
  }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error("Webhook handle error:", err);
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send("TRADING_GRAM Bot is active and running!");
}
