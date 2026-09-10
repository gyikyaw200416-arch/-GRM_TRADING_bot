import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// User ပို့လိုက်တဲ့ပုံရဲ့ file_id ကို chat ထဲ ပြန်ပို့ပေးမည့် code
bot.on("message:photo", async (ctx) => {
  const photoArray = ctx.message.photo;
  const fileId = photoArray[photoArray.length - 1].file_id;
  await ctx.reply(`Your Photo File ID is:\n\n\`${fileId}\``, { parse_mode: "Markdown" });
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
