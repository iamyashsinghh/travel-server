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
        
        const { ride_id, rating, comment } = await req.json();
        
        if (!ride_id || !rating) {
            return NextResponse.json({ error: "Ride ID and rating are required" }, { status: 400 });
        }
        
        const ride = await prisma.rides.findUnique({
            where: { id: ride_id },
        });
        
        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }
        
        // Create rating record
        const newRating = await prisma.ratings.create({
            data: {
                ride_id,
                from_type: "driver",
                from_id: driver.id,
                to_type: "user",
                to_id: ride.user_id,
                rating,
                comment
            }
        });
        
        // Update user's average rating
        const user = await prisma.users.findUnique({
            where: { id: ride.user_id }
        });
        
        const newTotalRating = user.rating_total + rating;
        const newRatingCount = user.no_of_ratings + 1;
        
        const updatedUser = await prisma.users.update({
            where: { id: ride.user_id },
            data: { 
                rating_total: newTotalRating,
                no_of_ratings: newRatingCount
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
