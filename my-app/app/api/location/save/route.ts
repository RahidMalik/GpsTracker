import { NextRequest, NextResponse, userAgent } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            visitorCode,
            source,
            latitude,
            longitude,
            accuracy,
            ipAddress,
            city,
            region,
            country,
            isp,
            userAgent: bodyUserAgent // Raw string from frontend
        } = body;

        if (!visitorCode) {
            return NextResponse.json({ error: "Visitor code is required" }, { status: 400 });
        }

        // 🟢 MAGIC STEP: Next.js ki apni API se OS, Browser aur Device ko extract karein
        const { device, browser, os } = userAgent(request);

        // Agar device.type undefined ho toh iska matlab standard PC/Laptop hai
        const parsedDevice = device.type === 'mobile' ? 'Mobile'
            : device.type === 'tablet' ? 'Tablet'
                : 'Desktop';

        const parsedBrowser = browser.name || "Unknown";
        const parsedOS = os.name || "Unknown";

        // 1. Check karo kya yeh Visitor pehle se database mein hai?
        const visitor = await prisma.visitor.upsert({
            where: { visitorCode: visitorCode },
            update: {
                userAgent: bodyUserAgent || undefined,
                deviceType: parsedDevice, // 🟢 Updated here
                browser: parsedBrowser,   // 🟢 Updated here
                os: parsedOS,             // 🟢 Updated here
            },
            create: {
                visitorCode: visitorCode,
                userAgent: bodyUserAgent || "",
                deviceType: parsedDevice, // 🟢 Updated here
                browser: parsedBrowser,   // 🟢 Updated here
                os: parsedOS,             // 🟢 Updated here
            }
        });

        // 2. Attach the new location with visitor Id and save it.
        const newLocation = await prisma.location.create({
            data: {
                visitorId: visitor.id, // Foreign Key connection 
                source: source,        // "GPS" ya "IP"
                latitude: Number(latitude),
                longitude: Number(longitude),
                accuracy: accuracy ? Number(accuracy) : null,
                ipAddress: ipAddress || null,
                city: city || null,
                region: region || null,
                country: country || null,
                isp: isp || null
            }
        });

        return NextResponse.json({ success: true, data: newLocation });
    } catch (error) {
        console.error("error saving location into database", error);
        return NextResponse.json({ error: "Internal server error in saving" }, { status: 500 });
    }
}