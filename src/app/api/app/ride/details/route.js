import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req) {
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

        const { searchParams } = new URL(req.url);
        const ride_id = searchParams.get("ride_id");

        if (!ride_id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        // Convert ride_id to integer
        const rideIdInt = parseInt(ride_id, 10);
        
        if (isNaN(rideIdInt)) {
            return NextResponse.json({ error: "Invalid ride ID format" }, { status: 400 });
        }

        const ride = await prisma.rides.findFirst({
            where: { id: rideIdInt, user_id: user.id },
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }
        if (ride.status === 'no_drivers_available') {
            return NextResponse.json({ error: "No drivers available" }, { status: 200 });
        }

        let is_loaded = false;
        let rideDetails;
        if(ride.driver_id){
            const driver = await prisma.drivers.findUnique({
                where: { id: ride.driver_id },
                include: { vehicles: true },
            });

            is_loaded = true;
            rideDetails = {
                ...ride,
                driver: driver,
            }
        }else{
            rideDetails = {
                ...ride,
            }
        }

        // If ride is completed and payment is done, add a flag to stop polling
        if (ride.status === 'completed' && ride.payment_done) {
            rideDetails.stop_polling = true;
            console.log(`Setting stop_polling flag for ride: ${rideIdInt}, user: ${user.id}`);
        }

        return NextResponse.json({ success: true, rideDetails, is_loaded });

    } catch (error) {
        console.error("❌ Error fetching ride:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
