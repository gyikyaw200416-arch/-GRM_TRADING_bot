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
      await supabase.rpc("increment_balance", { user_id: invitedBy, amount: 100 }); // ဥပမာ - ဖိတ်တဲ့သူကို 100 coin ပေးမယ်
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
    .web_app("🚀 Start Mining", "https://your-mini-app-url.com") // Mini App link ထည့်ရန်
    .row()
    .url("📢 Community", "https://t.me/your_channel"); // Channel link ထည့်ရန်

  const photoUrl = "GITHUB_RAW_IMAGE_URL_HERE"; // GitHub မှာ တင်ထားတဲ့ ပုံရဲ့ Raw URL ကို ထည့်ပါ

  await ctx.replyWithPhoto(photoUrl, {
    caption: `✨ *Welcome to GRAM Mining Bot!*\n\nEarn GRAM tokens by mining and inviting friends.\n\n👤 Your ID: \`${userId}\``,
    parse_mode: "Markdown",
    reply_markup: keyboard
  });
});

// Vercel serverless webhook export
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).send("OK");
  }
  return res.status(200).send("GRAM Mining Bot is running!");
}
