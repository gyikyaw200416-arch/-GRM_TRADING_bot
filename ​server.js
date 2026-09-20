const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Endpoint to verify user, check multi-account, and update info
app.post('/api/verify-user', async (req, res) => {
  try {
    const { telegram_id, device_hash } = req.body;

    if (!telegram_id || !device_hash) {
      return res.status(400).json({ 
        status: "ERROR", 
        message: "Incomplete data provided." 
      });
    }

    // Get client IP address
    const clientIp = req.headers['cf-connecting-ip'] || 
                     req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.socket.remoteAddress;

    // 1. Check if another user account already exists with the same IP or Device Hash
    const { data: existingUsers, error: checkError } = await supabase
      .from('grm_users')
      .select('user_id')
      .or(`ip_address.eq.${clientIp},device_hash.eq.${device_hash}`)
      .neq('user_id', telegram_id)
      .limit(1);

    if (checkError) throw checkError;

    // 2. If a duplicate is found, block the user
    if (existingUsers && existingUsers.length > 0) {
      const { error: blockError } = await supabase
        .from('grm_users')
        .update({ 
          ip_address: clientIp, 
          device_hash: device_hash, 
          is_blocked: true 
        })
        .eq('user_id', telegram_id);

      if (blockError) throw blockError;

      return res.json({
        status: "BLOCKED",
        message: "Multi-Account Detected! Multiple accounts are not allowed on the same device or IP address."
      });
    }

    // 3. Otherwise, update the user record normally and allow access
    const { error: updateError } = await supabase
      .from('grm_users')
      .update({ 
        ip_address: clientIp, 
        device_hash: device_hash, 
        is_blocked: false 
      })
      .eq('user_id', telegram_id);

    if (updateError) throw updateError;

    return res.json({ 
      status: "ALLOWED", 
      message: "Verification successful." 
    });

  } catch (err) {
    console.error("Backend Error:", err);
    return res.status(500).json({ 
      status: "ERROR", 
      message: err.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
