const express = require('express');
const router = express.Router();
const db = require('../database'); // database.js ချိတ်ဆက်ရန်

// 1. Deduct 10 GRM when starting the game
router.post('/start-game', async (req, res) => {
    const { userId } = req.body;
    try {
        // Deduct 10 GRM from user balance in database
        // (Modify the database query according to your database.js implementation)
        const stakeAmount = 10;
        
        // Example logic:
        // await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [stakeAmount, userId]);

        res.json({ 
            success: true, 
            message: "10 GRM deducted successfully" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 2. Add 20 GRM to the winner's balance
router.post('/win-game', async (res, req) => {
    const { userId } = req.body;
    try {
        const prizeAmount = 20;

        // Example logic to add 20 GRM:
        // await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [prizeAmount, userId]);

        res.json({ 
            success: true, 
            message: "20 GRM added to winner balance" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
