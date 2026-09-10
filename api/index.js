import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.command("start", async (ctx) => {
  // အောက်ပါ ပုံစံတူ Web App သို့မဟုတ် Inline Button ထည့်ရန်
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
    // ပုံနဲ့အတူ စာပါ ပို့ပေးမည့် ပုံစံ
    await ctx.replyWithPhoto(
      "https://your-image-url.com/image.jpg", // ပုံရဲ့ Direct URL ကို ဒီနေရာမှာ ထည့်ပါ
      {
        caption: captionText,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    // ပုံလင့်ခ် အလုပ်မလုပ်ရင် စာနဲ့ ခလုတ်သက်သက် ပို့ပေးရန် Fallback
    await ctx.reply(captionText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
});

bot.on("message", async (ctx) => {
  // အခြားစာများ ပို့လာပါက /start ကို ပြန်ညွှန်းပေးရန် သို့မဟုတ် တုံ့ပြန်ရန်
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
