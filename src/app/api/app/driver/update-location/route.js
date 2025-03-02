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
            decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        const { latitude, longitude } = await req.json();
        if (!latitude || !longitude) {
            return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
        }
        const updatedDriver = await prisma.drivers.update({
            where: { id: driver.id },
            data: { current_lat:latitude, current_long:longitude },
        });
        return NextResponse.json({
            success: true,
            message: "Fetched Successfully",
        })
    } catch (error) {
        console.error("OTP Verification Error:", error);
        return NextResponse.json({ error: "Error verifying OTP" }, { status: 500 });
    }
}
