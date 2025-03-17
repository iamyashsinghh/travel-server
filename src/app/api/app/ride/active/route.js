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
        
        // Find the most recent ride for this user that is not completed with payment done
        const ride = await prisma.rides.findFirst({
            where: {
                user_id: user.id,
                NOT: {
                    AND: [
                        { status: 'completed' },
                        { payment_done: true }
                    ]
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            include: {
                driver: {
                    include: {
                        vehicles: true
                    }
                }
            }
        });
        
        if (!ride) {
            return NextResponse.json({ 
                success: true, 
                message: "No active rides found",
                ride: null
            });
        }
        
        // Check if the ride is actually active (not cancelled or completed with payment)
        if (ride.status === 'cancelled' || (ride.status === 'completed' && ride.payment_done)) {
            console.log(`Filtering out non-active ride ${ride.id} for user ${user.id} - Status: ${ride.status}, Payment done: ${ride.payment_done}`);
            return NextResponse.json({ 
                success: true, 
                message: "No active rides found",
                ride: null
            });
        }

        return NextResponse.json({
            success: true,
            ride: ride
        });
    } catch (error) {
        console.error("Error checking active ride:", error);
        return NextResponse.json({ error: "Error checking active ride" }, { status: 500 });
    }
} 