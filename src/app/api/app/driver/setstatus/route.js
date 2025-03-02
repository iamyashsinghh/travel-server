import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function PATCH(req) {
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

        const { status } = await req.json();

        if (status === undefined) {
            return NextResponse.json({ error: "Status is required" }, { status: 400 });
        }

        const updatedDriver = await prisma.drivers.update({
            where: { id: driver.id },
            data: { status },
        });

        return NextResponse.json({
            success: true,
            message: "Status updated successfully",
            driver: updatedDriver
        });

    } catch (error) {
        console.error("❌ Error updating driver status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
