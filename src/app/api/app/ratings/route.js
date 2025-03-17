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

        const url = new URL(req.url);
        const type = url.searchParams.get("type") || "received"; // "received" or "given"
        const userType = url.searchParams.get("user_type"); // "user" or "driver"
        const id = parseInt(url.searchParams.get("id") || decoded.id);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        // Determine if the authenticated user is a user or driver
        let authenticatedUserType;
        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (user) {
            authenticatedUserType = "user";
        } else {
            const driver = await prisma.drivers.findUnique({ where: { id: decoded.id } });
            if (driver) {
                authenticatedUserType = "driver";
            } else {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
        }

        // If no user_type is provided, use the authenticated user's type
        const entityType = userType || authenticatedUserType;
        
        let whereClause = {};
        
        if (type === "received") {
            whereClause = {
                to_type: entityType,
                to_id: id
            };
        } else if (type === "given") {
            whereClause = {
                from_type: entityType,
                from_id: id
            };
        } else {
            return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
        }

        // Get total count for pagination
        const totalCount = await prisma.ratings.count({
            where: whereClause
        });

        // Get ratings with pagination
        const ratings = await prisma.ratings.findMany({
            where: whereClause,
            orderBy: {
                created_at: "desc"
            },
            skip,
            take: limit
        });

        // Get additional information for each rating
        const ratingsWithDetails = await Promise.all(ratings.map(async (rating) => {
            let fromEntity = null;
            let toEntity = null;
            
            // Get from entity details
            if (rating.from_type === "user") {
                fromEntity = await prisma.users.findUnique({
                    where: { id: rating.from_id },
                    select: { id: true, name: true, profile_picture: true }
                });
            } else {
                fromEntity = await prisma.drivers.findUnique({
                    where: { id: rating.from_id },
                    select: { id: true, name: true, profile_image: true }
                });
            }
            
            // Get to entity details
            if (rating.to_type === "user") {
                toEntity = await prisma.users.findUnique({
                    where: { id: rating.to_id },
                    select: { id: true, name: true, profile_picture: true }
                });
            } else {
                toEntity = await prisma.drivers.findUnique({
                    where: { id: rating.to_id },
                    select: { id: true, name: true, profile_image: true }
                });
            }
            
            // Get ride details
            const ride = await prisma.rides.findUnique({
                where: { id: rating.ride_id },
                select: {
                    id: true,
                    pickup_address: true,
                    drop_address: true,
                    created_at: true
                }
            });
            
            return {
                ...rating,
                from: fromEntity,
                to: toEntity,
                ride
            };
        }));

        return NextResponse.json({
            success: true,
            data: {
                ratings: ratingsWithDetails,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit)
                }
            },
            message: "Ratings fetched successfully"
        });
    } catch (error) {
        console.error("Get Ratings Error:", error);
        return NextResponse.json({ error: "Error fetching ratings" }, { status: 500 });
    }
} 