import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req, { params }) {
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
        
        // Get the ride ID from the URL params - properly awaited
        const paramsObject = await params;
        const { rideId } = paramsObject;
        
        if (!rideId) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        // Convert rideId to integer
        const rideIdInt = parseInt(rideId, 10);
        
        if (isNaN(rideIdInt)) {
            return NextResponse.json({ error: "Invalid ride ID format" }, { status: 400 });
        }
        
        // Find the ride with more details
        const ride = await prisma.rides.findUnique({
            where: { id: rideIdInt },
            select: {
                id: true,
                status: true,
                driver_id: true,
                user_id: true,
                cancelled_at: true,
                canceled_by: true,
                cancel_title: true,
                cancel_reason: true,
                fare: true,
                distance: true,
                duration: true,
                drop_at: true, 
                payment_mode: true,
                payment_done: true,
                is_rated: true,
                driver: {
                    select: {
                        id: true,
                        name: true,
                        profile_image: true
                    }
                }
            }
        });
        
        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }
        
        // Verify that the requester is either the driver or the user for this ride
        const isDriver = ride.driver_id === decoded.id;
        const isUser = ride.user_id === decoded.id;
        
        if (!isDriver && !isUser) {
            return NextResponse.json({ error: "You don't have permission to view this ride" }, { status: 403 });
        }

        // Prepare response based on ride status
        const response = {
            success: true,
            status: ride.status,
            show_rating: isUser && ride.status === 'completed' && ride.payment_done && !ride.is_rated,
            auto_dismiss_payment: ride.status === 'completed' && ride.payment_done,
            show_completion_alert: false, // Never show the completion alert
            needs_rating: isUser && ride.status === 'completed' && ride.payment_done && !ride.is_rated
        };

        // If the ride needs rating, save relevant info for the rating modal
        if (response.show_rating || response.needs_rating) {
            response.driver_info = {
                id: ride.driver?.id,
                name: ride.driver?.name || "Your Driver",
                profile_image: ride.driver?.profile_image || null
            };
            
            // Tell client to save this ride for rating
            response.save_for_rating = true;
        }

        // Add cancelled info if applicable
        if (ride.status === 'canceled') {
            response.cancelled_info = {
                cancelled_at: ride.cancelled_at,
                canceled_by: ride.canceled_by,
                cancel_title: ride.cancel_title,
                cancel_reason: ride.cancel_reason
            };
        }

        // Add completed info if applicable
        if (ride.status === 'completed') {
            response.completed_info = {
                fare: ride.fare,
                distance: ride.distance,
                duration: ride.duration,
                completed_at: ride.drop_at,
                payment_mode: ride.payment_mode,
                payment_done: ride.payment_done,
                is_rated: ride.is_rated
            };
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error("Ride Status Error:", error.message);
        console.error("Error stack:", error.stack);
        return NextResponse.json({ error: "Error fetching ride status: " + error.message }, { status: 500 });
    }
} 