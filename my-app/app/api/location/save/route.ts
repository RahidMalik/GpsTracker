// app/api/location/save/route.ts
import { NextRequest, NextResponse } from "next/server";
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
            userAgent
        } = body;

        if (!visitorCode) {
            return NextResponse.json({ error: "Visitor code is required" }, { status: 400 });
        };

        // 1. Check karo kya yeh Visitor pehle se database mein hai?
        let visitor = await prisma.visitor.findFirst({
            where: { visitorCode: visitorCode }
        });

        if (!visitor) {
            // If a new visitor comes,create a new record
            visitor = await prisma.visitor.create({
                data: {
                    visitorCode: visitorCode,
                    userAgent: userAgent || "",
                    deviceType: "Unknown", // Isay hum baad mein parse karenge
                    browser: "Unknown",
                    os: "Unknown"
                }
            });
        } else {
            // if he is already in database so just update his lastseen
            visitor = await prisma.visitor.update({
                where: { id: visitor.id },
                data: { lastSeenAt: new Date }
            });
        };

        // 2.attach the new location with visitor Id and save it.
        const newLocation = await prisma.location.create({
            data: {
                visitorId: visitor.id, // Foreign Key connection 
                source: source,        // "GPS" ya "IP"
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                accuracy: accuracy ? parseFloat(accuracy) : null,
                ipAddress: ipAddress || null,
                city: city || null,
                region: region || null,
                country: country || null,
                isp: isp || null
            }
        });

        return NextResponse.json({ success: true, data: newLocation });
    } catch (error) {
        console.error("error saving location into database", error)
        return NextResponse.json({ error: "Internal server error in saving" }, { status: 500 });
    };
};