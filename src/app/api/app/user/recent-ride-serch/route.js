import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
    try {
        // Authentication check
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
        
        // Parse query parameters with defaults
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5'); // Default to 5 rides
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;
        
        // Get recent rides for the user for search screen
        const recentRides = await prisma.rides.findMany({
            where: {
                user_id: user.id,
                // We include all statuses for the search history
            },
            orderBy: {
                created_at: 'desc', // Most recent first
            },
            skip: skip,
            take: limit,
            select: {
                id: true,
                pickup_address: true,
                drop_address: true,
                pickup_lat: true,
                pickup_lng: true,
                drop_lat: true,
                drop_lng: true,
                status: true,
                fare: true,
                distance: true,
                created_at: true,
            }
        });
        
        // Get total count for pagination
        const totalRides = await prisma.rides.count({
            where: {
                user_id: user.id,
            }
        });

        // Format the response for the search screen
        const formattedRides = recentRides.map(ride => ({
            id: ride.id.toString(),
            main_text: ride.drop_address || "Unknown destination",
            secondary_text: ride.pickup_address || "Unknown pickup",
            place_id: ride.id.toString(),
            distance: `${(ride.distance / 1000).toFixed(1)} Km`,
            icon: "time",
            latitude: ride.drop_lat,
            longitude: ride.drop_lng,
            pickup_lat: ride.pickup_lat,
            pickup_lng: ride.pickup_lng,
            status: ride.status,
            fare: ride.fare,
            created_at: ride.created_at,
        }));
        
        return NextResponse.json({
            success: true,
            recent_rides: formattedRides,
            pagination: {
                total: totalRides,
                page: page,
                limit: limit,
                total_pages: Math.ceil(totalRides / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching recent rides for search:", error);
        return NextResponse.json({ error: "Error fetching recent rides" }, { status: 500 });
    }
} 