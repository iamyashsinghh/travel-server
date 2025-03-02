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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        

        return NextResponse.json({
            success: true,
            message: "Ride options fetched successfully",
        });

    } catch (error) {
        console.error('Error calculating fare:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
