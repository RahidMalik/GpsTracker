import { NextRequest, NextResponse } from "next/server";
import axios from "axios"

export async function GET(request: NextRequest) {
    try {
        // Getting user ip address
        let ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
        if (ip && ip.includes(",")) {
            ip = ip.split(",")[0].trim();
        }

        // 🟢 Localhost Testing Hack (Sirf Development mode mein chalega)
        if (process.env.NODE_ENV === "development" && (ip === "::1" || ip === "127.0.0.1" || !ip)) {
            ip = "223.123.97.205"; // Sirf local test ke liye dummy IP
        }

        // 🔴 Production Safety: Agar live server par real IP na mile toh error de do
        if (process.env.NODE_ENV === "production" && (!ip || ip === "::1" || ip === "127.0.0.1")) {
            return NextResponse.json({ error: "Valid public IP not detected" }, { status: 400 });
        }

        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`)

        const geoData = geoResponse.data;
        if (geoData.status === "fail") {
            return NextResponse.json({ error: "IP location fetch failed" }, { status: 400 });
        }

        // 3. User-Agent (Browser/Device info)
        const userAgent = request.headers.get("user-agent") || "";


        return NextResponse.json({
            ipAddress: geoData.query,
            city: geoData.city,
            region: geoData.regionName,
            country: geoData.country,
            isp: geoData.isp,
            latitude: geoData.lat,
            longitude: geoData.lon,
            userAgent: userAgent,
        });


    } catch (error) {
        console.error("Error in IP tracking route", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};