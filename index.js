import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || "";
  const payload = ctx.match; // Referral ID (e.g., /start 123456789)

  // 1. Check if user already exists in database
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!existingUser) {
    let invitedBy = null;
    if (payload && !isNaN(payload) && Number(payload) !== userId) {
      invitedBy = Number(payload);
      
      // Give bonus to the inviter
      await supabase.rpc("increment_balance", { user_id: invitedBy, amount: 100 }); 
    }

    // Insert new user
    await supabase.from("users").insert([
      {
        id: userId,
        username: username,
        balance: 50, // Welcome bonus
        invited_by: invitedBy,
        verified: false
      }
    ]);
  }

  // 2. Welcome Message & Buttons (ATF ပုံစံအတိုင်း ခလုတ်များ တည်ဆောက်ခြင်း)
  const keyboard = new InlineKeyboard()
    .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
    .row()
    .url("🌐 Community", "https://t.me/AI_TRADING_FOREX"); // သင့် Channel Link ထည့်ရန်

  // ⚠️ အရေးကြီးသည်: ဒီနေရာမှာ သင်ပြချင်တဲ့ ပုံရဲ့ GitHub Raw URL ကို ထည့်ပေးပါ
  const photoUrl = "https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPO/main/your-banner-image.jpg";

  const captionText = 
    `👋 *Welcome to TRADING_GRAM!*\n\n` +
    `⛏ Mine tokens directly to your Pool Wallet.\n` +
    `⚡ Tap to boost mining speed!\n` +
    `🔗 Connect your TON wallet.\n` +
    `💰 Hold tokens to upgrade your miner level!\n\n` +
    `👤 Your ID: \`${userId}\`\n\n` +
    `Click below to start.`;

  try {
    await ctx.replyWithPhoto(photoUrl, {
      caption: captionText,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    // ပုံလင့်ခ် မမှန်သေးရင် စာသားသက်သက်နဲ့ ခလုတ်ပါ ပို့ပေးမည့် Fallback
    await ctx.reply(captionText, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
});

// Vercel serverless webhook export
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).send("OK");
  }
  return res.status(200).send("TRADING_GRAM Bot is running!");
}
