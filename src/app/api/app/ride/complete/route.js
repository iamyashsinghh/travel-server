import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.error("Token verification failed:", err);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        
        const driver = await prisma.drivers.findUnique({
            where: { id: decoded.id },
        });
        
        if (!driver) {
            return NextResponse.json({ error: "driver not found" }, { status: 404 });
        }
        
        const { ride_id } = await req.json();
        
        if (!ride_id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }
        
        const updatedRide = await prisma.rides.update({
            where: { id: ride_id },
            data: { status: 'completed', drop_at: new Date() },
        });

        return NextResponse.json({
            success: true,
            data: updatedRide,
            message: "Ride marked as completed successfully",
        });
    } catch (error) {
        console.error("Complete Ride Error:", error);
        return NextResponse.json({ error: "Error completing ride" }, { status: 500 });
    }
} 