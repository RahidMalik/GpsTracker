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

        // 1. Check karo kya yeh Visitor pehle se database mein hai?. ha to thek ni ha to update kr do.
        const visitor = await prisma.visitor.upsert({
            where: { visitorCode: visitorCode },
            update: {
                userAgent: userAgent || undefined,// Agar naya userAgent aaye toh update ho jaye
            },
            create: {
                visitorCode: visitorCode,
                userAgent: userAgent || "",
                deviceType: "Unknown",
                browser: "Unknown",
                os: "Unknown",
            }
        });


        // 2.attach the new location with visitor Id and save it.
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
        console.error("error saving location into database", error)
        return NextResponse.json({ error: "Internal server error in saving" }, { status: 500 });
    };
};