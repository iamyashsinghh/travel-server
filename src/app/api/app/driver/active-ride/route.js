import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req) {
    try {
        const authHeader = req.headers.get("authorization");

        // Check if authorization header exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error("Token verification failed:", err);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Find driver by ID
        const driver = await prisma.drivers.findUnique({
            where: { id: decoded.id },
        });

        if (!driver) {
            return NextResponse.json({ error: "driver not found" }, { status: 404 });
        }
    
        const activeRide = await prisma.rides.findFirst({
            where: {
                driver_id: decoded.id,
                status: {
                    in: ['pending', 'accepted', 'arrived', 'ongoing'],
                },
                is_scheduled: false, 
            },
        });
        
        return NextResponse.json({ success: true, driver, activeRide });

    } catch (error) {
        console.error("❌ Error fetching driver:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
