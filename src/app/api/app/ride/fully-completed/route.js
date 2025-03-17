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
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }
        
        const { ride_id } = await req.json();
        
        if (!ride_id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }
        
        // Convert ride_id to integer
        const rideIdInt = parseInt(ride_id, 10);
        
        if (isNaN(rideIdInt)) {
            return NextResponse.json({ error: "Invalid ride ID format" }, { status: 400 });
        }
        
        // Check if the ride belongs to this driver
        const ride = await prisma.rides.findFirst({
            where: { 
                id: rideIdInt,
                driver_id: driver.id
            },
        });
        
        if (!ride) {
            return NextResponse.json({ error: "Ride not found or does not belong to this driver" }, { status: 404 });
        }
        
        const updatedRide = await prisma.rides.update({
            where: { id: rideIdInt },
            data: { payment_done: true },
        });

        return NextResponse.json({
            success: true,
            data: updatedRide,
            message: "Ride payment marked as done successfully",
        });
    } catch (error) {
        console.error("Payment Completion Error:", error);
        return NextResponse.json({ error: "Error marking payment as done" }, { status: 500 });
    }
} 