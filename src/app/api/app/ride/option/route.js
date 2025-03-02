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

    const body = await req.json();
    const { city, distance_km, duration_min, ride_date } = body;
    if (!city || isNaN(distance_km) || isNaN(duration_min) || !ride_date) {
      return NextResponse.json({ message: 'Missing or invalid request data' }, { status: 400 });
    }

    const rideDateObj = new Date(ride_date);
    const rideHour = rideDateObj.getHours();
    const rideDay = rideDateObj.getDay();

    const vehicleTypes = await prisma.vehicle_type.findMany({
      where: { status: { in: ["start_riding", "coming_soon"] } }
    });

    const rideOptions = vehicleTypes.map(vt => {
      const rules = typeof vt.rules === 'object' ? vt.rules : JSON.parse(vt.rules);

      let fare = Number(rules.initial_fee) +
        (distance_km * Number(rules.cost_per_km)) +
        (duration_min * Number(rules.cost_per_minute)) +
        Number(rules.booking_fee);

      let applicableMultiplier = 1;
      if (Array.isArray(rules.surges)) {
        rules.surges.forEach(surge => {
          if (
            rideHour >= surge.start_hour &&
            rideHour < surge.end_hour &&
            Array.isArray(surge.days) &&
            surge.days.includes(rideDay)
          ) {
            applicableMultiplier = Math.max(applicableMultiplier, Number(surge.multiplier));
          }
        });
      }
      fare *= applicableMultiplier;

      let totalAdjustment = 0;
      if (Array.isArray(rules.adjustments)) {
        rules.adjustments.forEach(adj => {
          if (rideHour >= adj.start_hour && rideHour < adj.end_hour) {
            totalAdjustment += Number(adj.fee);
          }
        });
      }
      fare += totalAdjustment;

      let eta = null;
      let available = vt.status === "start_riding";
      if (available) {
        eta = Math.floor(Math.random() * 4) + 1;
      }

      return {
        id: vt.id,
        name: vt.name,
        type: vt.type,
        no_of_person: vt.no_of_person,
        icon: vt.icon,
        status: vt.status,
        price: fare.toFixed(2),
        eta,
        duration_min: duration_min,
        distance_km: distance_km,
        available,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Ride options fetched successfully",
      data: rideOptions,
    });

  } catch (error) {
    console.error('Error calculating fare:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
