import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
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
        
        // Get completed rides for the user
        const completedRides = await prisma.rides.findMany({
            where: {
                user_id: user.id,
                status: 'completed',
            },
            orderBy: {
                updated_at: 'desc',
            },
            take: 5,
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        profile_image: true,
                        total_rating: true,
                        number_of_rating: true,
                    }
                }
            }
        });
        
        // Check which rides have been rated by this user
        const ratings = await prisma.ratings.findMany({
            where: {
                from_type: 'user',
                from_id: user.id,
                to_type: 'driver',
            },
            select: {
                ride_id: true,
            }
        });
        
        const ratedRideIds = ratings.map(rating => rating.ride_id);
        
        // Add is_rated flag to each ride
        const ridesWithRatingStatus = completedRides.map(ride => ({
            ...ride,
            is_rated: ratedRideIds.includes(ride.id),
        }));
        
        return NextResponse.json({
            success: true,
            completedRides: ridesWithRatingStatus,
        });
    } catch (error) {
        console.error("Error fetching completed rides:", error);
        return NextResponse.json({ error: "Error fetching completed rides" }, { status: 500 });
    }
} 