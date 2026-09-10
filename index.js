import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "";
    const payload = ctx.match; // Referral ID (ဥပမာ - /start 123456789)

    // 1. Check if user already exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
    }

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

    // 2. Welcome Message & Buttons
    const keyboard = new InlineKeyboard()
      .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/")
      .row()
      .url("🌐 Community", "https://t.me/AI_TRADING_FOREX"); // လိုအပ်ပါက သင့် Channel Link ထည့်ပါ

    // အလုပ်လုပ်သေချာစေရန် အဆင်သင့်သုံးနိုင်သော ပုံလင့်ခ် (လိုချင်ရင် ကိုယ့်ပုံလင့်ခ်နဲ့ လဲနိုင်ပါတယ်)
    const photoUrl = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop";

    const captionText = 
      `👋 *Welcome to TRADING_GRAM!*\n\n` +
      `⛏ Mine tokens directly to your Pool Wallet.\n` +
      `⚡ Tap to boost mining speed!\n` +
      `🔗 Connect your TON wallet.\n` +
      `💰 Hold tokens to upgrade your miner level!\n\n` +
      `👤 Your ID: \`${userId}\`\n\n` +
      `Click below to start.`;

    // ပုံနဲ့တကွ ပို့ရန်
    await ctx.replyWithPhoto(photoUrl, {
      caption: captionText,
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

  } catch (error) {
    console.error("Error in /start command:", error);
    // တစ်စုံတစ်ရာ Error တက်ခဲ့လျှင်တောင် စာနဲ့ခလုတ် ပုံမှန်ထွက်လာစေရန် Fallback
    const userId = ctx.from?.id || "Unknown";
    const fallbackKeyboard = new InlineKeyboard()
      .web_app("🚀 Start Mining", "https://grm-trading-bot.vercel.app/");

    await ctx.reply(`👋 *Welcome to TRADING_GRAM!*\n\nClick below to start mining.\n\n👤 Your ID: \`${userId}\``, {
      parse_mode: "Markdown",
      reply_markup: fallbackKeyboard
    });
  }
});

// Vercel serverless webhook export
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error("Webhook error:", err);
    }
    return res.status(200).send("OK");
  }
  return res.status(200).send("TRADING_GRAM Bot is running!");
}
