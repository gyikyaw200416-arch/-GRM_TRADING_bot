import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.command("start", async (ctx) => {
  // Web App UI ပုံစံတူ ခလုတ်များ ဖန်တီးခြင်း (ATF အစား GRM သုံးထားသည်)
  const keyboard = new InlineKeyboard()
    .webApp("✈ Mine (Claim)", "https://your-mining-website-url.com")
    .row()
    .webApp("📋 Tasks (+1 GRM)", "https://your-mining-website-url.com/tasks")
    .webApp("⚡ Miners Store", "https://your-mining-website-url.com/miners")
    .row()
    .webApp("👥 Friends", "https://your-mining-website-url.com/friends")
    .webApp("👤 Profile", "https://your-mining-website-url.com/profile")
    .row()
    .url("🌐 Community Channel", "https://discord.gg/NwsPcvukX");

  const captionText = 
    "👋 *Welcome to GRAM Mining Core!*\n\n" +
    "✈ *Mine GRM tokens directly to your Pool Wallet.*\n" +
    "⚡ *Tap to boost mining speed & level up!* (Active Level 185)\n" +
    "📋 *Complete Tasks to earn extra GRM rewards.*\n" +
    "🔗 *Connect your TON wallet and track assets.*\n\n" +
    "👇 *Click below to open Mining Dashboard:*";

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
