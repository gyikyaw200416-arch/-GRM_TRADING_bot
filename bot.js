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
    const userId = 'tg_' + rawUserId; // Database structure match: tg_ + id
    const username = telegramUser.username ? '@' + telegramUser.username : (telegramUser.first_name || 'Miner');
    const startPayload = ctx.payload; // Referral ID payload

    let assignedReferrerId = null;

    if (startPayload && startPayload.trim() !== '') {
      let refRaw = startPayload.trim();
      let refParsed = refRaw.startsWith('tg_') ? refRaw : 'tg_' + refRaw;
      if (refParsed !== userId) {
        assignedReferrerId = refParsed; // e.g. tg_6908636109
      }
    }

    // 1. Fetch existing user from Supabase
    let { data: existingUser, error: fetchError } = await supabase
      .from('grm_users')
      .select('user_id, referrer_id, balance, is_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) console.log('Fetch error:', fetchError.message);

    if (!existingUser) {
      // User အသစ်ဝင်လာလျှင် is_verified ကို false ဖြင့် စတင်သိမ်းဆည်းမည် (reward မပေးသေးပါ)
      let { error: insertError } = await supabase.from('grm_users').upsert([{
        user_id: userId,
        username: username,
        referrer_id: assignedReferrerId,
        balance: 0, 
        mined_amount: 0,
        mining_state: 'stopped',
        level: 0,
        is_verified: false, // Admin က verify လုပ်မှ true ဖြစ်မည်
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });

      if (insertError) console.log('Insert error:', insertError.message);

    } else {
      // ရှေ့မှာ ရှိပြီးသား user ဖြစ်ပြီး referrer_id မရှိသေးပါက ထည့်သွင်းပေးမည်
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

    // 2. Register Referral Relation in 'grm_referrals' table safely
    if (assignedReferrerId) {
      const refRelationId = 'ref_' + rawUserId;
      
      let { data: existingRef } = await supabase
        .from('grm_referrals')
        .select('*')
        .eq('id', refRelationId)
        .maybeSingle();

      if (!existingRef) {
        // Referral ဆက်သွယ်မှုကို မှတ်တမ်းတင်မည် (status ကို active သို့မဟုတ် pending ထားနိုင်သည်)
        let { error: refError } = await supabase.from('grm_referrals').upsert([{
          id: refRelationId,
          referrer_id: assignedReferrerId,
          referred_id: userId,
          status: 'active',
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });

        if (refError) console.log('Referral insert error:', refError.message);

        // Notify Referrer about the new join
        let targetChatId = assignedReferrerId.replace('tg_', '');
        await bot.telegram.sendMessage(
          targetChatId,
          `✅ **New Referral Joined!** 🎉\n\n👤 **Username:** ${username}\n🆔 **ID:** \`${rawUserId}\`\n\n🎁 Note: This referral will be counted as Successful and reward will be available after admin verification!`,
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
