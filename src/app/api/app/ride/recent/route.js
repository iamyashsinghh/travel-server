import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Get recent rides with filtering options
 * Supports filtering by:
 * - status (e.g. completed, pending, etc.)
 * - is_rated (true/false)
 * - limit (number of results to return)
 */
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
        
        // Parse URL query parameters for filtering
        const url = new URL(req.url);
        const status = url.searchParams.get("status"); // Optional status filter
        const isRatedParam = url.searchParams.get("is_rated"); // Optional is_rated filter
        const limitParam = url.searchParams.get("limit") || "5"; // Default to 5 results
        const limit = parseInt(limitParam, 10);
        
        // Build query filters
        const whereClause = {
            user_id: user.id,
        };
        
        // Add status filter if provided
        if (status) {
            whereClause.status = status;
        }
        
        // Get recent rides based on filters
        const rides = await prisma.rides.findMany({
            where: whereClause,
            orderBy: {
                created_at: 'desc',
            },
            take: isNaN(limit) ? 5 : limit,
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
        const ridesWithRatingStatus = rides.map(ride => ({
            ...ride,
            is_rated: ratedRideIds.includes(ride.id),
        }));
        
        // If is_rated filter is provided, filter the results
        let filteredRides = ridesWithRatingStatus;
        if (isRatedParam !== null) {
            const isRated = isRatedParam.toLowerCase() === 'true';
            filteredRides = ridesWithRatingStatus.filter(ride => ride.is_rated === isRated);
        }
        
        return NextResponse.json({
            success: true,
            rides: filteredRides,
            total: filteredRides.length,
        });
    } catch (error) {
        console.error("Error fetching recent rides:", error);
        return NextResponse.json({ error: "Error fetching recent rides" }, { status: 500 });
    }
} 