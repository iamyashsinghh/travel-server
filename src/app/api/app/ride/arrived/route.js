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
        const { ride_id } = await req.json();
        if (!ride_id) {
            return NextResponse.json({ error: "Ride id error" }, { status: 400 });
        }
        const updatedRide = await prisma.rides.update({
            where: { id: ride_id },
            data: { status: 'arrived', driver_id: driver.id, arrived_at: new Date() },
        });
        await prisma.ride_request_current_driver.deleteMany({ where: { ride_id: ride_id } });
        return NextResponse.json({
            success: true,
            data: updatedRide,
            message: "Fetched Successfully",
        })
    } catch (error) {
        console.error("OTP Verification Error:", error);
        return NextResponse.json({ error: "Error verifying OTP" }, { status: 500 });
    }
}
