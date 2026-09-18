const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// --- Supabase Configuration ---
const supabaseUrl = process.env.SUPABASE_URL || "https://uyblmdckdvqgammrfati.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YmxtZGNrZHZxZ2FtbXJmYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTYyNzAsImV4cCI6MjEwNDU5MjI3MH0.vYgmEwENTjeYEqEaE022rDAkAHTWD6pB8E29BoVt0eQ";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Local JSON Database Configuration (Original Code Preserved) ---
const DB_FILE = path.join(__dirname, 'referrals.json');

// Initialize the database file if it does not exist
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    }
}

// Save referral information (Local JSON + Supabase Integration)
async function saveReferral(inviterId, inviteeId) {
    initDB();
    
    // Prevent self-referral
    if (inviterId === inviteeId) {
        return { success: false, message: "Self-referral is not allowed." };
    }

    try {
        // 1. Original Local JSON Logic (Untouched)
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(rawData);

        // Check if the user has already been referred by someone in local storage
        if (data[inviteeId]) {
            return { success: false, message: "User has already been referred." };
        }

        // Save the new referral locally (Invitee ID -> Inviter ID)
        data[inviteeId] = {
            inviterId: inviterId,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

        // 2. Added Supabase Database Integration (Saves to grm_referrals table)
        const refRelationId = 'ref_' + inviteeId.replace('tg_', '');
        
        await supabase.from('grm_referrals').upsert([{
            id: refRelationId,
            referrer_id: inviterId,
            referred_id: inviteeId,
            status: 'active',
            created_at: new Date().toISOString()
        }], { onConflict: 'id' }).catch(err => {
            console.error("Supabase sync error (non-blocking):", err.message);
        });

        return { success: true, message: "Referral saved successfully." };
    } catch (error) {
        console.error("Error saving referral:", error);
        return { success: false, message: "Database error." };
    }
}

// Get total referral count for a specific user (Local JSON based)
function getReferralCount(inviterId) {
    initDB();
    try {
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(rawData);
        
        let count = 0;
        for (const invitee in data) {
            if (data[invitee].inviterId === inviterId) {
                count++;
            }
        }
        return count;
    } catch (error) {
        console.error("Error reading database:", error);
        return 0;
    }
}

module.exports = { initDB, saveReferral, getReferralCount };
