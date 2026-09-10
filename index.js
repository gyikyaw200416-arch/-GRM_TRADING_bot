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
      await supabase.rpc("increment_balance", { user_id: invitedBy, amount: 100 }); // ဖိတ်တဲ့သူကို 100 coin ပေးမယ်
    }

    // Insert new user
    await supabase.from("users").insert([
      {
        id: userId,
        username: username,
        balance: 50, // အသစ်ဝင်လာသူကို Welcome bonus 50 coin ပေးမယ်
        invited_by: invitedBy,
        verified: false
      }
    ]);
  }

  // 2. Welcome Message & Buttons
  const keyboard = new InlineKeyboard()
    .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/") // Mini App link ထည့်သွင်းပြီးပါပြီ
    .row()
    .url("📢 Community", "https://t.me/AI_TRADING_FOREX"); // လိုအပ်ပါက သင့် Channel Link ကို ဒီမှာ ပြောင်းထည့်နိုင်ပါတယ်

  const photoUrl = "GITHUB_RAW_IMAGE_URL_HERE"; // GitHub မှာ တင်ထားတဲ့ သင့်ပုံရဲ့ Raw URL ကို ဒီနေရာမှာ ထည့်ပေးပါ (ဥပမာ- https://raw.githubusercontent.com/.../image.jpg)

  try {
    await ctx.replyWithPhoto(photoUrl, {
      caption: `✨ *Welcome to TRADING_GRAM!*\n\nEarn tokens by mining and inviting friends.\n\n👤 Your ID: \`${userId}\``,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    // ပုံလင့်ခ် မမှန်သေးရင် သို့မဟုတ် ပုံမပေါ်လာရင် စာသားသက်သက်နဲ့ Error မတက်အောင် ပို့ပေးမယ့် Fallback
    await ctx.reply(`✨ *Welcome to TRADING_GRAM!*\n\nEarn tokens by mining and inviting friends.\n\n👤 Your ID: \`${userId}\``, {
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
