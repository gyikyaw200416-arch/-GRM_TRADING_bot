import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "";

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users").insert([
        { id: userId, username: username, balance: 50, verified: false }
      ]);
    }

    // ပုံထဲပါသည့်အတိုင်း ခလုတ်နာမည်များကို ထည့်သွင်းခြင်း
    const keyboard = new InlineKeyboard()
      .web_app("🚀 Start ATF Mining", "https://grm-trading-bot.vercel.app/")
      .row()
      .url("🌐 Community", "https://t.me/AI_TRADING_FOREX");

    // ပုံထဲပါသည့်အတိုင်း စာသားအတိအကျ
    const captionText = 
      `👋 Welcome to ATF Miner!\n\n` +
      `⛏ Mine ATF tokens directly to your Pool Wallet.\n` +
      `⚡ Tap to boost mining speed!\n` +
      `🔗 Connect your TON wallet.\n` +
      `💰 Hold ATF to upgrade your miner level!\n\n` +
      `Click below to start.`;

    // ပုံပါလင့်ခ် (သို့မဟုတ် သင်အသုံးပြုလိုသော ပုံလင့်ခ်)
    const photoUrl = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop";

    await ctx.replyWithPhoto(photoUrl, {
      caption: captionText,
      reply_markup: keyboard
    });
  } catch (error) {
    console.error("Error:", error);
    await ctx.reply("👋 Welcome to ATF Miner!\n\nClick below to start.", {
      reply_markup: new InlineKeyboard().web_app("🚀 Start ATF Mining", "https://grm-trading-bot.vercel.app/")
    });
  }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error("Handler error:", err);
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send("Bot is active!");
}
