import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Database se saare visitors uthao aur unki saari locations bhi sath le kar aao (Include Relations)
        const visitors = await prisma.visitor.findMany({
            include: {
                locations: {
                    orderBy: {
                        capturedAt: "desc"
                    }
                }
            },
            orderBy: {
                lastSeenAt: "desc"
            },
        });
        return NextResponse.json(visitors);
    } catch (error) {
        console.error("Error in fetching for admin ", error);
        return NextResponse.json({
            error: "Internal fetching error"
        }, { status: 500 })
    }
}
