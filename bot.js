const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN || "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";
const MINI_APP_URL = process.env.MINI_APP_URL || "https://grm-trading-bot.vercel.app/";
const COMMUNITY_URL = "https://discord.gg/NwsPcvukX";

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

bot.start(async (ctx) => {
  try {
    const telegramUser = ctx.from;
    const rawUserId = telegramUser.id.toString();
    const userId = 'tg_' + rawUserId; 
    const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
    const startPayload = ctx.payload; 

    let assignedReferrerId = null;

    if (startPayload && startPayload.trim() !== '') {
      let refRaw = startPayload.trim();
      let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw; 
      if (refParsed !== userId) {
        assignedReferrerId = refParsed; 
      }
    }

    let { data: existingUser, error: fetchError } = await supabase
      .from('grm_users')
      .select('user_id, referrer_id, balance, is_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) console.log('Fetch error:', fetchError.message);

    if (!existingUser) {
      let { error: insertError } = await supabase.from('grm_users').upsert([{
        user_id: userId,
        username: username,
        referrer_id: assignedReferrerId,
        balance: 0,
        mined_amount: 0,
        mining_state: 'stopped',
        level: 0,
        is_verified: false,
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });

      if (insertError) console.log('Insert error:', insertError.message);

    } else {
      if (!existingUser.referrer_id && assignedReferrerId) {
        let { error: updateError } = await supabase.from('grm_users')
          .update({ 
            referrer_id: assignedReferrerId, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);

        if (updateError) console.log('Update error:', updateError.message);
      }
    }

    if (assignedReferrerId) {
      const refRelationId = 'ref_' + rawUserId;
      
      let { data: existingRef } = await supabase
        .from('grm_referrals')
        .select('*')
        .eq('id', refRelationId)
        .maybeSingle();

      if (!existingRef) {
        let { error: refError } = await supabase.from('grm_referrals').upsert([{
          id: refRelationId,
          referrer_id: assignedReferrerId,
          referred_id: userId,
          status: 'pending',
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });

        if (refError) console.log('Referral insert error:', refError.message);

        let targetChatId = assignedReferrerId.replace('tg_', '');
        await bot.telegram.sendMessage(
          targetChatId,
          `✅ **New Referral Joined!** 🎉\n\n👤 **Username:** ${username}\n🆔 **ID:** \`${rawUserId}\`\n\n🎁 **Note:** This user is currently unverified. Successful status and the reward will unlock once the admin verifies this account!`,
          { parse_mode: 'Markdown' }
        ).catch((e) => console.log('Notification failed:', e.message));
      }
    }

    const captionText = 
      "👋 *Welcome to GRAM Mining Core!*\n\n" +
      "📉 *Mine GRAM tokens directly to your Pool Wallet.*\n" +
      "⚡ *Tap to boost mining speed!*\n" +
      "🔗 *Connect your TON wallet.*\n" +
      "💰 *GRAM to upgrade your miner level!*\n\n" +
      "*Click below to start.*";

    const replyMarkup = {
      inline_keyboard: [
        [{ text: '🚀 Start Mining', web_app: { url: MINI_APP_URL } }],
        [{ text: '🌐 Community', url: COMMUNITY_URL }]
      ]
    };

    try {
      await ctx.replyWithPhoto(
        "AgACAgUAAxkBAAIBNGqi2DLQ5k1Da8CwjDq78x-ymAbrAAJOE2sb384YVfji7oChJMUsAQADAgADeQADPQQ",
        {
          caption: captionText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        }
      );
    } catch (photoErr) {
      console.log('Photo send failed:', photoErr.message);
      await ctx.reply(captionText, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    }

  } catch (err) {
    console.error('Error in bot start command:', err);
  }
});

bot.launch();
console.log('GRM Telegram Bot is running successfully...');
