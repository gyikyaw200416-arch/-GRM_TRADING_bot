import { Bot } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "YOUR_BOT_TOKEN_HERE");

bot.command("start", async (ctx) => {
    const text = ctx.message.text;
    const arg = text.split(" ")[1];

    if (arg) {
        console.log(`User joined via referral ID: ${arg}`);
        try {
            await ctx.api.sendMessage(arg, `✅ A referral has been confirmed and is now Active! 🎉\n👤 Name: ${ctx.from.first_name}`);
        } catch (e) {
            console.error("Error sending ref notification:", e);
        }
    }

    const welcomeCaption = 
        `👋 Welcome to GRAM Miner!\n\n` +
        `⛏️ Mine GRAM tokens directly to your Pool Wallet.\n` +
        `⚡ Tap to boost mining speed!\n` +
        `🔗 Connect your TON wallet.\n\n` +
        `Click below to start.`;

    await ctx.replyWithPhoto("https://raw.githubusercontent.com/gyikyaw200416-arch/-GRM_TRADING_bot/main/gram.jpg", {
        caption: welcomeCaption,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🚀 Start Mining", web_app: { url: "https://your-webapp-url.com" } }],
                [{ text: "🌐 Community", url: "https://t.me/your_channel" }]
            ]
        }
    });
});

bot.start();
console.log("Bot is running...");
