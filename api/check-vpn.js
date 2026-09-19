// api/check-vpn.js (Vercel Serverless Function Example)
export default async function handler(req, res) {
  try {
    // 1. Get the client's IP address from Vercel or proxy headers
    const clientIp = 
      req.headers['x-forwarded-for']?.split(',')[0].trim() || 
      req.socket?.remoteAddress || 
      '';

    // Skip check for localhost or local testing (you can remove this in production)
    if (clientIp === '127.0.0.1' || clientIp === '::1') {
      return res.status(200).json({ allowed: true, message: "Localhost access allowed" });
    }

    // 2. Fetch IP details from an IP quality / VPN detection API (e.g., ipapi.co)
    // You can also integrate specialized VPN detectors like iphub or vpnapi if needed.
    const response = await fetch(`https://ipapi.co/${clientIp}/json/`);
    const data = await response.json();

    // 3. Check whether the connection originates from a Hosting, Datacenter, or VPN service
    const org = (data.org || '').toLowerCase();
    const asn = (data.asn || '').toLowerCase();
    
    // Check if common keywords related to VPNs, proxies, or cloud providers exist in organization/ASN data
    const isVpnOrProxy = 
      org.includes('hosting') || 
      org.includes('vpn') || 
      org.includes('proxy') || 
      org.includes('cloud') || 
      org.includes('digitalocean') || 
      org.includes('aws') || 
      org.includes('ovh');

    if (!isVpnOrProxy) {
      // Deny access if a VPN or proxy is not detected
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "Please turn on a VPN to access this application." 
      });
    }

    // Grant access if a VPN is detected
    return res.status(200).json({ allowed: true, message: "Access granted via VPN." });

  } catch (error) {
    console.error("VPN Check Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
