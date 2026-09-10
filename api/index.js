import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp("🚀 Start Mining", "https://your-mining-website-url.com") // ကိုယ့် Web App လင့်ခ်ထည့်ရန်
    .row()
    .url("🌐 Community", "https://t.me/your_channel"); // လိုချင်သော ချန်နယ်လင့်ခ်ထည့်ရန်

  const captionText = 
    "👋 *Welcome to GRAM Mining Core!*\n\n" +
    "⛏️ *Mine GRAM tokens directly to your Pool Wallet.*\n" +
    "⚡ *Tap to boost mining speed!*\n" +
    "🔗 *Connect your TON wallet.*\n" +
    "💰 *GRAM to upgrade your miner level!*\n\n" +
    "Click below to start.";

  try {
    // GitHub ကနေ ပုံမှန် Raw URL ကို တိုက်ရိုက်ယူသုံးထားသည်
    await ctx.replyWithPhoto(
      "https://raw.githubusercontent.com/gyikyaw/GRM_TRADING_bot/main/IMG_20260910_112246_587.jpg",
      {
        caption: captionText,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error sending photo:", error);
    // ပုံပို့လို့မရရင် စာနဲ့ ခလုတ်သက်သက် ပို့ပေးမည်
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
