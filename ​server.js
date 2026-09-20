const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Endpoint to update user IP and device fingerprint
app.post('/api/update-user-info', async (req, res) => {
  try {
    const { currentUserId, deviceId } = req.body;

    // Get client IP address
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Update user record in Supabase
    const { data, error } = await supabase
      .from('grm_users')
      .update({ 
        ip_address: userIp,
        device_fingerprint: deviceId
      })
      .eq('user_id', currentUserId);

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      message: 'User info updated successfully', 
      data 
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
