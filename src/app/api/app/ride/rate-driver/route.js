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
        
        const user = await prisma.users.findUnique({
            where: { id: decoded.id },
        });
        
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        const { ride_id, rating, comment } = await req.json();
        
        if (!ride_id || !rating) {
            return NextResponse.json({ error: "Ride ID and rating are required" }, { status: 400 });
        }
        
        // Convert ride_id to integer
        const rideIdInt = parseInt(ride_id, 10);
        
        if (isNaN(rideIdInt)) {
            return NextResponse.json({ error: "Invalid ride ID format" }, { status: 400 });
        }
        
        const ride = await prisma.rides.findUnique({
            where: { id: rideIdInt },
        });
        
        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }
        
        if (!ride.driver_id) {
            return NextResponse.json({ error: "No driver assigned to this ride" }, { status: 400 });
        }
        
        // Create rating record
        const newRating = await prisma.ratings.create({
            data: {
                ride_id: rideIdInt,
                from_type: "user",
                from_id: user.id,
                to_type: "driver",
                to_id: ride.driver_id,
                rating,
                comment
            }
        });
        
        // Update driver's average rating
        const driver = await prisma.drivers.findUnique({
            where: { id: ride.driver_id }
        });
        
        const newTotalRating = driver.total_rating + rating;
        const newRatingCount = driver.number_of_rating + 1;
        
        const updatedDriver = await prisma.drivers.update({
            where: { id: ride.driver_id },
            data: { 
                total_rating: newTotalRating,
                number_of_rating: newRatingCount
            },
        });

        const updatedRide = await prisma.rides.update({
            where: { id: rideIdInt },
            data: {
                is_rated: true
            },
        });

        return NextResponse.json({
            success: true,
            data: newRating,
            message: "Rating submitted successfully",
        });
    } catch (error) {
        console.error("Rating Error:", error);
        return NextResponse.json({ error: "Error submitting rating" }, { status: 500 });
    }
} 