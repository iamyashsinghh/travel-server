import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Reuse haversineDistance.
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest available driver using the Haversine formula,
 * excluding those with IDs in excludeDriverIds.
 * Returns the driver if within 5 km.
 */
async function findNearestDriver(pickup_lat, pickup_lng, excludeDriverIds = []) {
  const availableDrivers = await prisma.drivers.findMany({
    where: {
      status: "on_duty",
      current_lat: { not: null },
      current_long: { not: null },
      id: { notIn: excludeDriverIds },
      rides: {
        none: {
          status: { in: ["accepted", "arrived", "ongoing"] },
        },
      },
      assigned_rides: {
        none: {
          status: { in: ["accepted", "arrived", "ongoing"] },
        },
      },
    },
  });

  if (availableDrivers.length === 0) return null;

  const driversWithDistance = availableDrivers.map((driver) => ({
    ...driver,
    distance: haversineDistance(
      parseFloat(pickup_lat),
      parseFloat(pickup_lng),
      driver.current_lat,
      driver.current_long
    ),
  }));

  driversWithDistance.sort((a, b) => a.distance - b.distance);
  const nearestDriver = driversWithDistance[0];
  return nearestDriver.distance <= 5 ? nearestDriver : null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { ride_id } = body;
    if (!ride_id) {
      return NextResponse.json({ error: "Missing ride_id" }, { status: 400 });
    }

    // Retrieve the ride record.
    const ride = await prisma.rides.findUnique({ where: { id: ride_id } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    // If the ride is no longer pending, it means a driver has accepted it.
    if (ride.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Ride already accepted by a driver." },
        { status: 200 }
      );
    }

    // Exclude the drivers that have already been attempted.
    const attemptedDriverIds = ride.attempted_driver_ids || [];
    const newDriver = await findNearestDriver(ride.pickup_lat, ride.pickup_lng, attemptedDriverIds);

    if (!newDriver) {
      // No new available driver found; mark the ride as "understood".
      const updatedRide = await prisma.rides.update({
        where: { id: ride_id },
        data: { status: "understood" },
      });
      return NextResponse.json(
        {
          success: false,
          message: "No available drivers found. Ride marked as understood.",
          ride: updatedRide,
        },
        { status: 200 }
      );
    } else {
      // Update the ride with the new assigned driver and update attempted_driver_ids.
      const updatedRide = await prisma.rides.update({
        where: { id: ride_id },
        data: {
          assigned_driver_id: newDriver.id,
          attempted_driver_ids: [...attemptedDriverIds, newDriver.id],
        },
      });

      // Emit a new ride_request event to the new driver.
      const io = global.io;
      if (io) {
        const driverDetails = await prisma.drivers.findUnique({
          where: { id: newDriver.id },
        });
        io.to(driverDetails.socket_id).emit("ride_request", {
          ride_id: ride_id,
          pickup_lat: ride.pickup_lat,
          pickup_lng: ride.pickup_lng,
          drop_lat: ride.drop_lat,
          drop_lng: ride.drop_lng,
          fare: ride.fare,
          distance: ride.distance,
          duration: ride.duration,
          ride_type: ride.ride_type,
          assigned_driver_id: newDriver.id,
        });
      }
      return NextResponse.json(
        {
          success: true,
          message: "Ride request sent to a new driver.",
          ride: updatedRide,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error processing ride timeout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
