const express = require('express');
const router = express.Router();
const supabase = require('../database'); // Connect to Supabase client from database.js

// 1. API to deduct 10 GRM when starting the game
router.post('/start-game', async (req, res) => {
    const { userId } = req.body;
    try {
        // First, check the user's current balance
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('balance')
            .eq('telegram_id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent playing if balance is less than 10 GRM
        if (user.balance < 10) {
            return res.status(400).json({ success: false, message: "Insufficient balance (Need 10 GRM)" });
        }

        const newBalance = user.balance - 10;

        // Update the new balance in Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', userId);

        if (updateError) throw updateError;

        res.json({ 
            success: true, 
            message: "10 GRM deducted successfully", 
            balance: newBalance 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. API to add 20 GRM to the winner's balance
router.post('/win-game', async (req, res) => {
    const { userId } = req.body;
    try {
        // Get the winner's current balance
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('balance')
            .eq('telegram_id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const newBalance = user.balance + 20;

        // Add 20 GRM reward to the balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', userId);

        if (updateError) throw updateError;

        res.json({ 
            success: true, 
            message: "20 GRM added to winner balance", 
            balance: newBalance 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
