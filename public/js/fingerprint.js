async function generateDeviceFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        navigator.platform
    ];

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("GRM_Security_Check", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("GRM_Security_Check", 4, 17);
        components.push(canvas.toDataURL());
    } catch (e) {
        components.push("canvas_failed");
    }

    const stringData = components.join('###');
    const encoder = new TextEncoder();
    const data = encoder.encode(stringData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyUserAndDevice() {
    try {
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData || "";
        const user = tg?.initDataUnsafe?.user;

        if (!user || !user.id) return;

        const deviceHash = await generateDeviceFingerprint();

        const response = await fetch('/api/verify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.id,
                device_hash: deviceHash,
                init_data: initData
            })
        });

        const result = await response.json();

        if (result.status === "BLOCKED") {
            document.body.innerHTML = `
                <div style="height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#121212; color:#ff4d4d; font-family:sans-serif; text-align:center; padding:20px;">
                    <h1 style="font-size:24px; margin-bottom:10px;">⛔ Access Denied</h1>
                    <p style="color:#cccccc; font-size:16px;">${result.message}</p>
                </div>
            `;
            if (tg) tg.disableClosingConfirmation();
        } else {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    } catch (error) {
        console.error("Verification Error:", error);
    }
}

window.addEventListener('DOMContentLoaded', verifyUserAndDevice);
