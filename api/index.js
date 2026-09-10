import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Optional: Set up your bot commands or handlers here
bot.command("start", async (ctx) => {
  await ctx.reply("Hello! Your bot is now working successfully.");
});

bot.on("message", async (ctx) => {
  await ctx.reply("I received your message!");
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Initialize the bot to fix the "Bot not initialized!" error
      await bot.init();
      
      // Handle the incoming Telegram update
      await bot.handleUpdate(req.body);
      
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Bot update error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(200).send("Telegram bot server is running!");
}
