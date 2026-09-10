import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp("🚀 Start Mining", "https://your-mining-website-url.com")
    .row()
    .url("🌐 Community", "https://discord.gg/NwsPcvukX");

  const captionText = 
    "👋 *Welcome to GRAM Mining Core!*\n\n" +
    "✈ *Mine GRAM tokens directly to your Pool Wallet.*\n" +
    "⚡ *Tap to boost mining speed!*\n" +
    "🔗 *Connect your TON wallet.*\n" +
    "💰 *GRAM to upgrade your miner level!*\n\n" +
    "Click below to start.";

  // GitHub URL အစား Bot ချတ်ထဲ ပုံပို့ပြီးရလာတဲ့ file_id (သို့မဟုတ်) Telegram file id ကို ဒီကွင်းစကွင်းပိတ်ထဲမှာ ထည့်ပါ
  await ctx.replyWithPhoto(
    "AgACAgUAAxkBAAI...", 
    {
      caption: captionText,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
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
