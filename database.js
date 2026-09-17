const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'referrals.json');

// Initialize the database file if it does not exist
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    }
}

// Save referral information
function saveReferral(inviterId, inviteeId) {
    initDB();
    
    // Prevent self-referral
    if (inviterId === inviteeId) {
        return { success: false, message: "Self-referral is not allowed." };
    }

    try {
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(rawData);

        // Check if the user has already been referred by someone
        if (data[inviteeId]) {
            return { success: false, message: "User has already been referred." };
        }

        // Save the new referral (Invitee ID -> Inviter ID)
        data[inviteeId] = {
            inviterId: inviterId,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return { success: false, message: "Referral saved successfully." };
    } catch (error) {
        console.error("Error saving referral:", error);
        return { success: false, message: "Database error." };
    }
}

// Get total referral count for a specific user
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
