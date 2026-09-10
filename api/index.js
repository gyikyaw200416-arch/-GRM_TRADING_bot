import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";

const bot = new Bot(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  const user = ctx.from;

  try {
    const { error } = await supabase
      .from("telegram_users")
      .upsert({
        id: user.id,
        username: user.username || "",
        first_name: user.first_name || "",
      });

    if (error) {
      console.error("Supabase Error:", error);
    }
  } catch (err) {
    console.error("Database connection error:", err);
  }

  const photoUrl = "https://picsum.photos/800/400";
  const captionText = 
`👋 Welcome to ATF Miner!

⛏️ Mine ATF tokens directly to your Pool Wallet.
⚡ Tap to boost mining speed!
🔗 Connect your TON wallet.
💰 Hold ATF to upgrade your miner level!

Click below to start.`;

  const keyboard = new InlineKeyboard()
    .webApp("🚀 Start ATF Mining", "https://grm-trading-bot.vercel.app")
    .row()
    .url("🌐 Community", "https://t.me/telegram");

  await ctx.replyWithPhoto(photoUrl, {
    caption: captionText,
    reply_markup: keyboard,
  });
});

// Vercel Serverless Function အတွက် Handler အသစ်
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Bot error:", err);
      return res.status(500).json({ error: "Failed to process update" });
    }
  }
  return res.status(200).json({ status: "Bot is running!" });
}
