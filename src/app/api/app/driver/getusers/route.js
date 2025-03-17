import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");

        // Check if authorization header exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error("Token verification failed:", err);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Find driver by ID to verify authorization
        const driver = await prisma.drivers.findUnique({
            where: { id: decoded.id },
        });

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }
    
        // Find user by ID
        const user = await prisma.users.findUnique({
            where: { id: parseInt(user_id) },
            select: {
                id: true,
                name: true,
                mobile: true,
                profile_picture: true,
                rating_total: true,
                no_of_ratings: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Calculate average rating if available
        let averageRating = 0;
        if (user.no_of_ratings > 0 && user.rating_total) {
            averageRating = user.rating_total / user.no_of_ratings;
        }

        // Return user details with calculated average rating
        return NextResponse.json({ 
            success: true, 
            user: {
                ...user,
                average_rating: averageRating.toFixed(1)
            } 
        });

    } catch (error) {
        console.error("❌ Error fetching user details:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
} 