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
        
        // Get user from decoded token
        const user = await prisma.users.findUnique({
            where: { id: decoded.id },
        });
        
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        // Parse request body
        const { ride_id, cancel_title, cancel_reason } = await req.json();
        
        if (!ride_id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        // Convert ride_id to integer if it's a string
        const rideIdInt = typeof ride_id === 'string' ? parseInt(ride_id, 10) : ride_id;
        
        if (isNaN(rideIdInt)) {
            return NextResponse.json({ error: "Invalid ride ID format" }, { status: 400 });
        }
        
        // Find the ride and verify it belongs to the user
        const ride = await prisma.rides.findFirst({
            where: { 
                id: rideIdInt,
                user_id: user.id
            },
        });
        
        if (!ride) {
            return NextResponse.json({ error: "Ride not found or does not belong to this user" }, { status: 404 });
        }
        
        // Check if ride is in a cancellable state
        if (ride.status === 'completed' || ride.status === 'canceled') {
            return NextResponse.json({ 
                error: `Cannot cancel ride in ${ride.status} state`, 
                status: false 
            }, { status: 400 });
        }
        
        // Update ride status to cancelled
        const updatedRide = await prisma.rides.update({
            where: { id: rideIdInt },
            data: { 
                status: 'canceled',
                cancel_title: cancel_title || null,
                cancel_reason: cancel_reason || null,
                cancelled_at: new Date(),
                canceled_by: 'user',
                canceled_id: user.id
            },
        });

        // If the ride had a driver assigned, notify them
        if (ride.driver_id) {
            // In a real implementation, you would send a notification to the driver
            console.log(`Notify driver ${ride.driver_id} about cancelled ride ${ride.id}`);
            
            // Here you could send push notifications, etc.
        }

        return NextResponse.json({
            success: true,
            message: "Ride cancelled successfully",
            data: updatedRide
        });
    } catch (error) {
        console.error("Cancel Ride Error:", error);
        return NextResponse.json({ error: "Error cancelling ride", success: false }, { status: 500 });
    }
} 