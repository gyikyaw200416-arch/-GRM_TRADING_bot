const express = require('express');
const router = express.Router();
const db = require('../db'); // Verify that your database config file path is correct

router.post('/verify-user', async (req, res) => {
    try {
        const { telegram_id, device_hash } = req.body;

        if (!telegram_id || !device_hash) {
            return res.status(400).json({ status: "ERROR", message: "Incomplete data provided." });
        }

        const clientIp = req.headers['cf-connecting-ip'] || 
                         req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                         req.socket.remoteAddress;

        // 1. Check if another account exists with the same IP or Device Hash
        const duplicateQuery = `
            SELECT user_id FROM grm_users 
            WHERE (ip_address = $1 OR device_hash = $2) 
            AND user_id != $3 
            LIMIT 1;
        `;
        const duplicateResult = await db.query(duplicateQuery, [clientIp, device_hash, telegram_id]);

        if (duplicateResult.rows.length > 0) {
            await db.query(
                `UPDATE grm_users SET is_blocked = true, ip_address = $1, device_hash = $2 WHERE user_id = $3`,
                [clientIp, device_hash, telegram_id]
            );

            return res.json({
                status: "BLOCKED",
                message: "Multi-Account Detected! Multiple accounts are not allowed on the same device or IP address."
            });
        }

        // 2. Allow access and update user records if validation passes
        await db.query(
            `UPDATE grm_users 
             SET ip_address = $1, device_hash = $2, is_blocked = false 
             WHERE user_id = $3`,
            [clientIp, device_hash, telegram_id]
        );

        return res.json({ status: "ALLOWED", message: "Verification successful." });

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ status: "ERROR", message: "Internal Server Error" });
    }
});

module.exports = router;
