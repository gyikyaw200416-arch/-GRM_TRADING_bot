import { Bot, InlineKeyboard, webhookCallback } from "grammy";

// Environment Variables များမှ Token နှင့် URL များကို ရယူခြင်း
const BOT_TOKEN = process.env.BOT_TOKEN || "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";

const bot = new Bot(BOT_TOKEN);

// /start command အတွက် တုံ့ပြန်မှု ရေးသားခြင်း
bot.command("start", async (ctx) => {
  const photoUrl = "https://picsum.photos/800/400"; // သင့် Banner ပုံ Link ကို ဒီမှာ အစားထိုးပါ

  const captionText = 
`👋 Welcome to ATF Miner!

⛏️ Mine ATF tokens directly to your Pool Wallet.
⚡ Tap to boost mining speed!
🔗 Connect your TON wallet.
💰 Hold ATF to upgrade your miner level!

Click below to start.`;

  const keyboard = new InlineKeyboard()
    .webApp("🚀 Start ATF Mining", "https://grm-trading-bot.vercel.app") // သင့် Mini App Web URL ထည့်ပါ
    .row()
    .url("🌐 Community", "https://t.me/telegram"); // သင့် Telegram Group/Channel Link ထည့်ပါ

  await ctx.replyWithPhoto(photoUrl, {
    caption: captionText,
    reply_markup: keyboard,
  });
});

// Vercel Serverless Function အတွက် Export လုပ်ခြင်း
export default webhookCallback(bot, "std/http");
