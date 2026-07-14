import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ visitorCode: string }> }
) {
    try {
        // In Next.js 15+, params is a Promise that must be awaited
        const { visitorCode } = await params;

        if (!visitorCode) {
            return NextResponse.json(
                { error: "Visitor code is required" },
                { status: 400 }
            );
        }

        // Fetch location history using Prisma
        const locations = await prisma.location.findMany({
            where: {
                visitor: {
                    visitorCode: visitorCode,
                },
            },
            orderBy: {
                capturedAt: "asc", // Order by creation time to draw a continuous path
            },
            select: {
                latitude: true,
                longitude: true,
                capturedAt: true,
            },
        });

        // If no locations are found for the given visitorCode, return 404
        if (!locations || locations.length === 0) {
            return NextResponse.json(
                { error: "No location history found for this visitor" },
                { status: 404 }
            );
        }

        // Map the results to match the exact JSON structure requested
        const formattedLocations = locations.map((loc) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            createdAt: loc.capturedAt, 
        }));

        // Return the formatted array with a 200 OK status
        return NextResponse.json(formattedLocations, { status: 200 });

    } catch (error) {
        console.error("Error fetching location history:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
