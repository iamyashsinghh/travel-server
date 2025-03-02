import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error("JWT verification failed:", error);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const body = await req.json();
        const { pickup_lat, pickup_lng, drop_lat, drop_lng, fare, distance, duration, ride_type } = body;

        if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng || !fare || !distance || !duration || !ride_type) {
            return NextResponse.json({ message: 'Missing or invalid request data' }, { status: 400 });
        }
        const newRide = await prisma.rides.create({
            data: {
                user_id: user.id,
                pickup_lat: parseFloat(pickup_lat),
                pickup_lng: parseFloat(pickup_lng),
                drop_lat: parseFloat(drop_lat),
                drop_lng: parseFloat(drop_lng),
                fare: parseFloat(fare),
                payment_mode: 'cash',
                distance: parseFloat(distance),
                duration: parseInt(duration, 10),
                status: 'pending',
                ride_type: ride_type,
            }
        });

        return NextResponse.json({ success: true, ride_id: newRide.id });

    } catch (error) {
        console.error('Error processing ride request:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
