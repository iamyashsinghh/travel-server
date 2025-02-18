import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const { name } = await req.json();
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        const user = await prisma.users.findUnique({
            where: { id: decoded.id }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const updatedUser = await prisma.users.update({
            where: { id: decoded.id },
            data: { name },
        });
        return NextResponse.json({
            success: true,
            message: "Name updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating user name:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
