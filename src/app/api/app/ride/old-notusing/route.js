import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Expo } from 'expo-server-sdk';
const expo = new Expo();
const prisma = new PrismaClient();
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

/**
 * Calculates the distance (in km) between two coordinates using the Haversine formula.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
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
 * Finds the nearest available driver using the Haversine formula.
 * Optionally, a list of driver IDs can be excluded.
 * Returns the nearest driver if within 5 km.
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
    // Authenticate request.
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
    const {
      pickup_lat,
      pickup_lng,
      drop_lat,
      drop_lng,
      fare,
      distance,
      duration,
      ride_type,
    } = body;
    if (
      !pickup_lat ||
      !pickup_lng ||
      !drop_lat ||
      !drop_lng ||
      !fare ||
      !distance ||
      !duration ||
      !ride_type
    ) {
      return NextResponse.json(
        { error: "Missing or invalid request data" },
        { status: 400 }
      );
    }

    const newRide = await prisma.rides.create({
      data: {
        user_id: user.id,
        pickup_lat: parseFloat(pickup_lat),
        pickup_lng: parseFloat(pickup_lng),
        drop_lat: parseFloat(drop_lat),
        drop_lng: parseFloat(drop_lng),
        fare: parseFloat(fare),
        payment_mode: "cash",
        distance: parseFloat(distance),
        duration: parseInt(duration, 10),
        status: "pending",
        ride_type: ride_type,
        attempted_driver_ids: [],
      },
    });

    const nearestDriver = await findNearestDriver(
      parseFloat(pickup_lat),
      parseFloat(pickup_lng)
    );
    if (!nearestDriver) {
      return NextResponse.json(
        { error: "No available drivers found within 5km" },
        { status: 404 }
      );
    }

    // // Update ride: assign the driver and add his ID to attempted_driver_ids.
    // await prisma.rides.update({
    //   where: { id: newRide.id },
    //   data: {
    //     assigned_driver_id: nearestDriver.id,
    //     attempted_driver_ids: [nearestDriver.id],
    //   },
    // });
    const driverDetails = await prisma.drivers.findUnique({
      where: { id: nearestDriver.id },
    });
    const auth = new GoogleAuth({
      // Adjust the path to your service account JSON as needed:
      keyFile: path.join(process.cwd(), 'google-service.json'),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    console.log('Access Token:', accessToken);

    const projectId = 'rider-app-56d5e';
    const notificationPayload = {
      message: {
        notification: {
          title: 'Urgent Alert!',
          body: 'This is a full-screen notificationhftgfgjhgjghghghgjg!',
        },
        android: {
          priority: 'HIGH',
          notification: {
            channelId: 'ride_alerts',
            visibility: 'PUBLIC',
            fullScreenIntent: true,
          },
        },
        token: 'dKS7xHbxQQauQdDTeG1rVi:APA91bF32MaByiu-Ilj9SfhHtPONM9xBSvYeM9As76qO7H9stfSWwmS-zRi_zqpNFMgeqTteIHnxkFgusSdW0vQ7Ce-SE4qf8PM6LNP6jWWTRjVljjtbK2Y',
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      }
    );
    console.log(response)



    // try {
    //   const driverDetails = await prisma.drivers.findUnique({
    //     where: { id: nearestDriver.id },
    //   });
    //   console.log(driverDetails.expo_token)
    //   const messages = [{
    //     to: driverDetails.expo_token,
    //     content_available: true,
    //     priority: "high",
    //     data: {
    //       rideData: {
    //         ride_id: newRide.id,
    //         pickup_lat,
    //         pickup_lng,
    //         drop_lat,
    //         drop_lng,
    //         fare,
    //         distance,
    //         duration,
    //         ride_type,
    //         assigned_driver_id: nearestDriver.id,
    //       }
    //     },
    //   }];
    //   const messages2 = [{
    //     to: driverDetails.expo_token,
    //     title: 'New ride request!' || "Notification",
    //     body: 'Pickup at: D12/60' || "You have a new message!",
    //     priority: 'high',
    //     useFcmV1: true,
    //     channelId: "ride_alerts",
    //     sound: 'ride_ring',
    //     data: {
    //       rideData: {
    //         ride_id: newRide.id,
    //         pickup_lat,
    //         pickup_lng,
    //         drop_lat,
    //         drop_lng,
    //         fare,
    //         distance,
    //         duration,
    //         ride_type,
    //         assigned_driver_id: nearestDriver.id,
    //       }
    //     },
    //   }];
    //   const tickets = await expo.sendPushNotificationsAsync(messages);
    //   const tickets2 = await expo.sendPushNotificationsAsync(messages2);

    //   console.log(tickets)



    //   // const data = await response.json();
    //   return NextResponse.json(
    //     { success: true },
    //     { status: 200 }
    //   );
    // } catch (error) {
    //   console.error("Push notification error:", error);
    //   return NextResponse.json(
    //     { success: false, error: "Failed to send notification" },
    //     { status: 500 }
    //   );
    // }

    // Emit a Socket.io event to notify the driver.
    // const io = global.io;
    // if (io) {
    //   const driverDetails = await prisma.drivers.findUnique({
    //     where: { id: nearestDriver.id },
    //   });
    //   io.to(driverDetails.socket_id).emit("ride_request", {
    //     ride_id: newRide.id,
    //     pickup_lat,
    //     pickup_lng,
    //     drop_lat,
    //     drop_lng,
    //     fare,
    //     distance,
    //     duration,
    //     ride_type,
    //     assigned_driver_id: nearestDriver.id,
    //   });
    // }
    return NextResponse.json({ success: true, ride_id: newRide.id }, { status: 201 });
  } catch (error) {
    console.error("Error processing ride request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
