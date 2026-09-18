const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN || "8693095942:AAFhQ-g838_CbWL5QqpfXR0T76_IEkNCctE";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://uyblmdckdvqgammrfati.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";
const MINI_APP_URL = process.env.MINI_APP_URL || "https://t.me/GRM_TRADING_bot/app";

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

bot.start(async (ctx) => {
  try {
    const telegramUser = ctx.from;
    const rawUserId = telegramUser.id.toString();
    const userId = 'tg_' + rawUserId;
    const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
    const startPayload = ctx.payload; // Referral ID payload (e.g. 6908636109 or tg_6908636109)

    let assignedReferrerId = null;

    if (startPayload && startPayload.trim() !== '') {
      let refRaw = startPayload.trim();
      let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
      if (refParsed !== userId) {
        assignedReferrerId = refParsed;
      }
    }

    // 1. Fetch existing user from Supabase
    let { data: existingUser } = await supabase
      .from('grm_users')
      .select('user_id, referrer_id, balance')
      .eq('user_id', userId)
      .maybeSingle();

    const REWARD_AMOUNT = 10; // Reward bonus amount

    if (!existingUser) {
      // If user doesn't exist, create new user with referrer_id if available
      let initialBalance = assignedReferrerId ? REWARD_AMOUNT : 0;

      await supabase.from('grm_users').upsert([{
        user_id: userId,
        username: username,
        referrer_id: assignedReferrerId,
        balance: initialBalance,
        mined_amount: 0,
        mining_state: 'stopped',
        level: 0,
        is_verified: false,
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });

    } else {
      // If user exists but doesn't have a referrer yet, update it once
      if (!existingUser.referrer_id && assignedReferrerId) {
        let newBalance = (existingUser.balance || 0) + REWARD_AMOUNT;

        await supabase.from('grm_users')
          .update({ 
            referrer_id: assignedReferrerId, 
            balance: newBalance,
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
      }
    }

    // 2. Register Referral Relation in 'grm_referrals' table safely
    if (assignedReferrerId) {
      const refRelationId = 'ref_' + rawUserId;
      
      let { data: existingRef } = await supabase
        .from('grm_referrals')
        .select('*')
        .eq('id', refRelationId)
        .maybeSingle();

      if (!existingRef) {
        // Insert new referral relation
        await supabase.from('grm_referrals').upsert([{
          id: refRelationId,
          referrer_id: assignedReferrerId,
          referred_id: userId,
          status: 'active',
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });

        // Notify Referrer only on the first successful referral join
        let targetChatId = assignedReferrerId.replace('tg_', '').replace('user_', '');
        await bot.telegram.sendMessage(
          targetChatId,
          `✅ **New Referral Joined!** 🎉\n\n👤 **Username:** ${username}\n🆔 **ID:** \`${rawUserId}\`\n\n🎁 Check your Mini App Friends section to see the history!`,
          { parse_mode: 'Markdown' }
        ).catch((e) => console.log('Notification failed:', e.message));
      }
    }

    // 3. Send Mini App Launch Button
    await ctx.reply('Welcome to GRM Mining Core! Click below to start mining and trading.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Open GRM App', web_app: { url: MINI_APP_URL } }]
        ]
      }
    });

  } catch (err) {
    console.error('Error in bot start command:', err);
  }
});

bot.launch();
console.log('GRM Telegram Bot is running successfully...');
