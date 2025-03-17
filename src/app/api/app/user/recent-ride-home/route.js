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
        const limit = parseInt(searchParams.get('limit') || '3'); // Default to 3 rides
        
        // Get recent rides for the user for home screen
        const recentRides = await prisma.rides.findMany({
            where: {
                user_id: user.id,
                // Excluding cancelled rides
                NOT: {
                    status: 'canceled'
                }
            },
            orderBy: {
                created_at: 'desc', // Most recent first
            },
            take: limit, // Limit the number of rides
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

        // Format the response for the home screen
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
            fare: ride.fare,
            created_at: ride.created_at,
        }));
        
        return NextResponse.json({
            success: true,
            recent_rides: formattedRides,
        });
    } catch (error) {
        console.error("Error fetching recent rides for home:", error);
        return NextResponse.json({ error: "Error fetching recent rides" }, { status: 500 });
    }
} 