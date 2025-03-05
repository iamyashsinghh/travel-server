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

        const user = await prisma.users.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { socket_id } = await req.json();

        if (socket_id === undefined) {
            return NextResponse.json({ error: "Socket id is required" }, { status: 400 });
        }

        const updatedUser = await prisma.users.update({
            where: { id: user.id },
            data: { socket_id:socket_id },
        });

        return NextResponse.json({
            success: true,
            message: "Status updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("❌ Error updating user socket:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
