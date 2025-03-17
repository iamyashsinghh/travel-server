import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Expo } from 'expo-server-sdk';
const expo = new Expo();
const prisma = new PrismaClient();

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

async function findNearestDriver(pickup_lat, pickup_lng, excludeDriverIds = [], fallback = false) {
    const assignedDrivers = await prisma.ride_request_current_driver.findMany({
      select: { driver_id: true },
    });
    const assignedDriverIds = assignedDrivers.map((item) => item.driver_id);
    const safeExcludedDriverIds = Array.isArray(excludeDriverIds) ? excludeDriverIds : [];
    const allExcludedIds = [...safeExcludedDriverIds, ...assignedDriverIds];
    if (!fallback) {
      const whereClause = {
        status: "on_duty",
        current_lat: { not: null },
        current_long: { not: null },
        id: { notIn: allExcludedIds },
        rides: {
          none: { status: { in: ["accepted", "arrived", "ongoing"] } },
        },
        assigned_rides: {
          none: { status: { in: ["accepted", "arrived", "ongoing"] } },
        },
      };
      const availableDrivers = await prisma.drivers.findMany({
        where: whereClause,
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
    //   console.log('normal', driversWithDistance[0])
      return driversWithDistance[0];
    } else {
      // Fallback: select a random driver from the provided excluded pool if available
      const fallbackPool = safeExcludedDriverIds.filter((id) => !assignedDriverIds.includes(id));
      if (fallbackPool.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * fallbackPool.length);
      const selectedDriverId = fallbackPool[randomIndex];
      const driver = await prisma.drivers.findUnique({ where: { id: selectedDriverId } });
    //   console.log('normal', driver)
      return driver;
    }
  }

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];
        if (!token) return unauthorizedResponse();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return unauthorizedResponse();

        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) return notFoundResponse("User");

        const body = await req.json();
        if (!body || Object.keys(body).length === 0) {
            return badRequestResponse();
        }

        const newRide = await createRide(user.id, body);
        await attemptDriverAssignment(newRide.id);
        return NextResponse.json({ success: true, ride_id: newRide.id }, { status: 200 });
    } catch (error) {
        // console.error("Error processing ride request:", error);
        return serverErrorResponse();
    }
}

async function attemptDriverAssignment(rideId, fallbackCount = 0, timeoutId) {
    // console.log(🔄 Assigning driver for Ride ID: ${rideId});
    if (timeoutId) {
        // console.log("⏳ Clearing existing timeout:", timeoutId);
        clearTimeout(timeoutId);
    }
    const ride = await prisma.rides.findUnique({
        where: { id: rideId },
    });
    // console.log("🚖 Ride Details:", ride);
    if (!ride || ride.status !== 'pending') {
        // console.log("⚠️ Ride is no longer pending, stopping process.");
        return;
    }
    const driver = await findNearestDriver(ride.pickup_lat, ride.pickup_lng, ride.attempted_driver_ids);
    // console.log("🧑‍✈️ Found Driver:", driver);
    if (!driver) {
        if (fallbackCount >= 5) {
            await prisma.ride_request_current_driver.deleteMany({
                where: { ride_id: rideId }
            });        
            // console.log("❌ Maximum fallback attempts reached.");
            await updateRideStatus(rideId, "no_drivers_available");
            return;
          }
      
        // console.log("⚠️ No available driver, checking fallback...");
        const fallbackDriver = await findNearestDriver(ride.pickup_lat, ride.pickup_lng, ride.attempted_driver_ids, true);
        if (!fallbackDriver) {
        // console.log("❌ No fallback drivers found.");
        await updateRideStatus(rideId, 'no_drivers_available');
        return;
        }

        // console.log("🆘 Assigning fallback driver:", fallbackDriver);
        await createDriverAttempt(rideId, fallbackDriver.id);
        await updateCurrentDriver(rideId, fallbackDriver.id);
        await sendDriverNotifications(ride, fallbackDriver);

        const newTimeoutId = setTimeout(async () => {
            const latestRideData = await prisma.rides.findUnique({
                where: { id: rideId }
            })
            console.log(latestRideData)
            if (latestRideData.status === 'pending') {
                console.log("⏳ Timeout triggered for ride:", rideId);
                await handleDriverTimeout(rideId, fallbackDriver);
                await attemptDriverAssignment(rideId, fallbackCount + 1);
            } else {
                await prisma.ride_request_current_driver.deleteMany({
                    where: { ride_id: rideId }
                });        
                // console.log("✅ Ride Status is not pending anymore so not required to send ride timeout notification (handleDriverTimeout) & reassign another driver (attemptDriverAssignment)")
                return;
            }
        }, 65000);

        return;
    }

    // console.log("✅ Assigning Driver:", driver);
    await createDriverAttempt(rideId, driver.id);
    await updateCurrentDriver(rideId, driver.id);

    try {
        // console.log("📲 Sending push notification...");
        await sendDriverNotifications(ride, driver);

        // console.log("⏳ Scheduling timeout for response...");
        const newTimeoutId = setTimeout(async () => {
            const latestRideData = await prisma.rides.findUnique({
                where: { id: rideId }
            })
            if (latestRideData.status === 'pending') {
                console.log("⏳ Timeout triggered for ride:", rideId);
                await handleDriverTimeout(rideId, driver);
                await attemptDriverAssignment(rideId);
            } else {
                await prisma.ride_request_current_driver.deleteMany({
                    where: { ride_id: rideId }
                });        
                // console.log("✅ Ride Status is not pending anymore so not required to send ride timeout notification (handleDriverTimeout) & reassign another driver (attemptDriverAssignment)")
                return;
            }
        }, 65000);

    } catch (error) {
        // console.error("❌ Notification failed:", error);
        await handleDriverTimeout(rideId);
        await attemptDriverAssignment(rideId);
    }
}

async function handleDriverTimeout(rideId, driver) {
    const driverDetails = await prisma.drivers.findUnique({
        where: { id: driver.id }
    });
    const notificationPayload = {
        to: driverDetails.expo_token,
        title: 'Request timeout!',
        body: 'You are late!',
        priority: 'high',
        useFcmV1: true,
        data: { rideTimeout: true }
    };
    const notification2Payload = {
        to: driverDetails.expo_token,
        content_available: true,
        priority: "high",
        data: { rideTimeout: true }
    };
    await expo.sendPushNotificationsAsync([notificationPayload]);
    await expo.sendPushNotificationsAsync([notification2Payload]);
    await prisma.ride_request_current_driver.deleteMany({ where: { ride_id: rideId } });
}

async function createRide(userId, data) {
    return prisma.rides.create({
        data: {
            user_id: userId,
            pickup_lat: parseFloat(data.pickup_lat),
            pickup_lng: parseFloat(data.pickup_lng),
            drop_lat: parseFloat(data.drop_lat),
            drop_lng: parseFloat(data.drop_lng),
            fare: parseFloat(data.fare),
            payment_mode: "cash",
            pickup_address: data.pickup_address,
            drop_address: data.drop_address,
            distance: parseFloat(data.distance),
            duration: parseInt(data.duration, 10),
            status: "pending",
            ride_type: data.ride_type,
            attempted_driver_ids: [],
        },
    });
}

async function createDriverAttempt(rideId, driverId) {
    try {
        const rideAttempt = await prisma.ride_attempt.create({
            data: { ride_id: rideId, driver_id: driverId }
        });
    } catch (error) {
        console.error('Error creating driver attempt:', error);
    }
}

async function updateCurrentDriver(rideId, driverId) {
    try {
        let ride = await prisma.rides.findUnique({
            where: { id: rideId },
        });

        const currentDriverIds = ride.attempted_driver_ids || [];

        const updatedDriverIds = [...currentDriverIds, driverId];

        ride = await prisma.rides.update({
            where: { id: rideId },
            data: { attempted_driver_ids: updatedDriverIds }
        });
        await prisma.ride_request_current_driver.deleteMany({
            where: { ride_id: rideId }
        });
        const rideRequestCurrentDriver = await prisma.ride_request_current_driver.create({
            data: { ride_id: rideId, driver_id: driverId }
        });
    } catch (error) {
        console.error("Error in updateCurrentDriver:", error);
    }
}

async function sendDriverNotifications(ride, driver) {
    const driverDetails = await prisma.drivers.findUnique({
        where: { id: driver.id }
    });
    const notificationPayload = {
        to: driverDetails.expo_token,
        title: 'New Ride Request!',
        body: 'New ride available nearby',
        priority: 'high',
        useFcmV1: true,
        channelId: "ride_alerts",
        sound: 'ride_ring',
        data: { rideData: { ...ride, assigned_driver_id: driver.id } }
    };
    const notification2Payload = {
        to: driverDetails.expo_token,
        content_available: true,
        priority: "high",
        data: { rideData: { ...ride, assigned_driver_id: driver.id } }
    };

    await expo.sendPushNotificationsAsync([notificationPayload]);
    await expo.sendPushNotificationsAsync([notification2Payload]);
}

async function updateRideStatus(rideId, status) {
    return prisma.rides.update({
        where: { id: rideId },
        data: { status: status }
    });
}

function unauthorizedResponse() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function notFoundResponse(entity) {
    return NextResponse.json({ error: `${entity} not found ` }, { status: 404 });
}

function badRequestResponse() {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}

function serverErrorResponse() {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}



// import { PrismaClient } from "@prisma/client";
// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import { Expo } from "expo-server-sdk";

// const expo = new Expo();
// const prisma = new PrismaClient();

// function haversineDistance(lat1, lng1, lat2, lng2) {
//   console.log(
//     `Calculating distance between (${lat1}, ${lng1}) and (${lat2}, ${lng2})`
//   );
//   const toRad = (x) => (x * Math.PI) / 180;
//   const R = 6371;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lng2 - lng1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const distance = R * c;
//   console.log(`Distance calculated: ${distance} km`);
//   return distance;
// }

// async function findNearestDriver(
//   pickup_lat,
//   pickup_lng,
//   excludeDriverIds = [],
//   fallback = false
// ) {
//   console.log(
//     `Finding nearest driver for (${pickup_lat}, ${pickup_lng}) with fallback: ${fallback}`
//   );
//   console.log("Exclude list received:", excludeDriverIds);
//   const assignedDrivers = await prisma.ride_request_current_driver.findMany({
//     select: { driver_id: true },
//   });
//   console.log("Currently assigned drivers:", assignedDrivers);
//   const assignedDriverIds = assignedDrivers.map((item) => item.driver_id);
//   console.log("Assigned driver IDs:", assignedDriverIds);
//   const safeExcludedDriverIds = Array.isArray(excludeDriverIds)
//     ? excludeDriverIds
//     : [];
//   const allExcludedIds = [...safeExcludedDriverIds, ...assignedDriverIds];
//   console.log("Total excluded IDs:", allExcludedIds);

//   if (!fallback) {
//     const whereClause = {
//       status: "on_duty",
//       current_lat: { not: null },
//       current_long: { not: null },
//       id: { notIn: allExcludedIds },
//       rides: {
//         none: { status: { in: ["accepted", "arrived", "ongoing"] } },
//       },
//       assigned_rides: {
//         none: { status: { in: ["accepted", "arrived", "ongoing"] } },
//       },
//     };
//     console.log("Querying available drivers with:", whereClause);
//     const availableDrivers = await prisma.drivers.findMany({
//       where: whereClause,
//     });
//     console.log("Available drivers found:", availableDrivers);
//     if (availableDrivers.length === 0) {
//       console.log("No available drivers found.");
//       return null;
//     }
//     const driversWithDistance = availableDrivers.map((driver) => {
//       const distance = haversineDistance(
//         parseFloat(pickup_lat),
//         parseFloat(pickup_lng),
//         driver.current_lat,
//         driver.current_long
//       );
//       return { ...driver, distance };
//     });
//     driversWithDistance.sort((a, b) => a.distance - b.distance);
//     console.log("Nearest driver selected:", driversWithDistance[0]);
//     return driversWithDistance[0];
//   } else {
//     // Fallback: select a random driver from the provided excluded pool if available
//     console.log("Executing fallback driver selection.");
//     const fallbackPool = safeExcludedDriverIds.filter(
//       (id) => !assignedDriverIds.includes(id)
//     );
//     console.log("Fallback pool IDs:", fallbackPool);
//     if (fallbackPool.length === 0) {
//       console.log("No drivers available in fallback pool.");
//       return null;
//     }
//     const randomIndex = Math.floor(Math.random() * fallbackPool.length);
//     const selectedDriverId = fallbackPool[randomIndex];
//     console.log(`Fallback driver selected: ${selectedDriverId}`);
//     const driver = await prisma.drivers.findUnique({
//       where: { id: selectedDriverId },
//     });
//     console.log("Fallback driver details:", driver);
//     return driver;
//   }
// }

// export async function POST(req) {
//   console.log("POST request received.");
//   try {
//     const authHeader = req.headers.get("authorization");
//     console.log("Authorization header:", authHeader);
//     const token = authHeader?.split(" ")[1];
//     if (!token) {
//       console.log("No token found. Unauthorized request.");
//       return unauthorizedResponse();
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded token:", decoded);
//     if (!decoded?.id) {
//       console.log("Decoded token missing user ID.");
//       return unauthorizedResponse();
//     }

//     const user = await prisma.users.findUnique({ where: { id: decoded.id } });
//     console.log("User retrieved:", user);
//     if (!user) {
//       console.log("User not found in database.");
//       return notFoundResponse("User");
//     }

//     const body = await req.json();
//     console.log("Request body:", body);
//     if (!body || Object.keys(body).length === 0) {
//       console.log("Bad request: Missing required fields.");
//       return badRequestResponse();
//     }

//     const newRide = await createRide(user.id, body);
//     console.log("Ride created:", newRide);
//     await attemptDriverAssignment(newRide.id);
//     console.log("Driver assignment initiated for ride:", newRide.id);
//     return NextResponse.json(
//       { success: true, ride_id: newRide.id },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error processing ride request:", error);
//     return serverErrorResponse();
//   }
// }

// async function attemptDriverAssignment(rideId, fallbackCount = 0, timeoutId) {
//   console.log(
//     `Attempting driver assignment for ride ${rideId} with fallbackCount: ${fallbackCount}`
//   );
//   if (timeoutId) {
//     console.log("Clearing previous timeout with ID:", timeoutId);
//     clearTimeout(timeoutId);
//   }
//   const ride = await prisma.rides.findUnique({ where: { id: rideId } });
//   console.log("Ride details:", ride);
//   if (!ride || ride.status !== "pending") {
//     console.log("Ride no longer pending. Exiting assignment process.");
//     return;
//   }
//   const driver = await findNearestDriver(
//     ride.pickup_lat,
//     ride.pickup_lng,
//     ride.attempted_driver_ids
//   );
//   console.log("Driver found:", driver);
//   if (!driver) {
//     if (fallbackCount >= 5) {
//       console.log("Maximum fallback attempts reached. Deleting current driver assignments.");
//       await prisma.ride_request_current_driver.deleteMany({
//         where: { ride_id: rideId },
//       });
//       console.log("Updating ride status to no_drivers_available.");
//       await updateRideStatus(rideId, "no_drivers_available");
//       return;
//     }
//     console.log("No available driver found. Trying fallback.");
//     const fallbackDriver = await findNearestDriver(
//       ride.pickup_lat,
//       ride.pickup_lng,
//       ride.attempted_driver_ids,
//       true
//     );
//     if (!fallbackDriver) {
//       console.log("No fallback driver found. Updating ride status.");
//       await updateRideStatus(rideId, "no_drivers_available");
//       return;
//     }
//     console.log("Assigning fallback driver:", fallbackDriver);
//     await createDriverAttempt(rideId, fallbackDriver.id);
//     await updateCurrentDriver(rideId, fallbackDriver.id);
//     await sendDriverNotifications(ride, fallbackDriver);
//     const newTimeoutId = setTimeout(async () => {
//       console.log("Fallback driver timeout triggered for ride:", rideId);
//       const latestRideData = await prisma.rides.findUnique({
//         where: { id: rideId },
//       });
//       console.log("Latest ride data after timeout:", latestRideData);
//       if (latestRideData.status === "pending") {
//         console.log("Ride still pending. Handling fallback driver timeout.");
//         await handleDriverTimeout(rideId, fallbackDriver);
//         await attemptDriverAssignment(rideId, fallbackCount + 1);
//       } else {
//         console.log("Ride status updated; clearing current driver assignments.");
//         await prisma.ride_request_current_driver.deleteMany({
//           where: { ride_id: rideId },
//         });
//         return;
//       }
//     }, 65000);
//     console.log("Fallback driver timeout set with ID:", newTimeoutId);
//     return;
//   }

//   console.log("Assigning driver:", driver);
//   await createDriverAttempt(rideId, driver.id);
//   await updateCurrentDriver(rideId, driver.id);

//   try {
//     console.log("Sending push notifications to driver.");
//     await sendDriverNotifications(ride, driver);
//     console.log("Scheduling driver response timeout.");
//     const newTimeoutId = setTimeout(async () => {
//       console.log("Driver timeout triggered for ride:", rideId);
//       const latestRideData = await prisma.rides.findUnique({
//         where: { id: rideId },
//       });
//       console.log("Latest ride data after timeout:", latestRideData);
//       if (latestRideData.status === "pending") {
//         console.log("Ride still pending. Handling driver timeout.");
//         await handleDriverTimeout(rideId, driver);
//         await attemptDriverAssignment(rideId);
//       } else {
//         console.log("Ride status updated; clearing current driver assignments.");
//         await prisma.ride_request_current_driver.deleteMany({
//           where: { ride_id: rideId },
//         });
//         return;
//       }
//     }, 65000);
//     console.log("Driver response timeout set with ID:", newTimeoutId);
//   } catch (error) {
//     console.error("Error sending notifications:", error);
//     await handleDriverTimeout(rideId);
//     await attemptDriverAssignment(rideId);
//   }
// }

// async function handleDriverTimeout(rideId, driver) {
//   console.log(
//     `Handling timeout for ride ${rideId} with driver: ${driver ? driver.id : "N/A"}`
//   );
//   const driverDetails = await prisma.drivers.findUnique({
//     where: { id: driver.id },
//   });
//   console.log("Driver details for timeout:", driverDetails);
//   const notificationPayload = {
//     to: driverDetails.expo_token,
//     title: "Request timeout!",
//     body: "You are late!",
//     priority: "high",
//     useFcmV1: true,
//     data: { rideTimeout: true },
//   };
//   const notification2Payload = {
//     to: driverDetails.expo_token,
//     content_available: true,
//     priority: "high",
//     data: { rideTimeout: true },
//   };
//   console.log("Sending timeout notifications:", notificationPayload, notification2Payload);
//   await expo.sendPushNotificationsAsync([notificationPayload]);
//   await expo.sendPushNotificationsAsync([notification2Payload]);
//   console.log("Deleting current driver assignment for ride:", rideId);
//   await prisma.ride_request_current_driver.deleteMany({
//     where: { ride_id: rideId },
//   });
// }

// async function createRide(userId, data) {
//   console.log("Creating ride with data:", { userId, data });
//   const ride = await prisma.rides.create({
//     data: {
//       user_id: userId,
//       pickup_lat: parseFloat(data.pickup_lat),
//       pickup_lng: parseFloat(data.pickup_lng),
//       drop_lat: parseFloat(data.drop_lat),
//       drop_lng: parseFloat(data.drop_lng),
//       fare: parseFloat(data.fare),
//       payment_mode: "cash",
//       distance: parseFloat(data.distance),
//       duration: parseInt(data.duration, 10),
//       status: "pending",
//       ride_type: data.ride_type,
//       attempted_driver_ids: [],
//     },
//   });
//   console.log("Ride successfully created:", ride);
//   return ride;
// }

// async function createDriverAttempt(rideId, driverId) {
//   console.log(
//     `Creating driver attempt record for ride ${rideId} with driver ${driverId}`
//   );
//   try {
//     const rideAttempt = await prisma.ride_attempt.create({
//       data: { ride_id: rideId, driver_id: driverId },
//     });
//     console.log("Driver attempt record created:", rideAttempt);
//   } catch (error) {
//     console.error("Error creating driver attempt:", error);
//   }
// }

// async function updateCurrentDriver(rideId, driverId) {
//   console.log(`Updating current driver for ride ${rideId} with driver ${driverId}`);
//   try {
//     let ride = await prisma.rides.findUnique({
//       where: { id: rideId },
//     });
//     console.log("Current ride data:", ride);
//     const currentDriverIds = ride.attempted_driver_ids || [];
//     const updatedDriverIds = [...currentDriverIds, driverId];
//     console.log("Updated driver IDs:", updatedDriverIds);
//     ride = await prisma.rides.update({
//       where: { id: rideId },
//       data: { attempted_driver_ids: updatedDriverIds },
//     });
//     console.log("Ride updated with new attempted_driver_ids:", ride);
//     await prisma.ride_request_current_driver.deleteMany({
//       where: { ride_id: rideId },
//     });
//     console.log("Cleared previous driver assignment records for ride:", rideId);
//     const rideRequestCurrentDriver = await prisma.ride_request_current_driver.create({
//       data: { ride_id: rideId, driver_id: driverId },
//     });
//     console.log("Created new current driver record:", rideRequestCurrentDriver);
//   } catch (error) {
//     console.error("Error in updateCurrentDriver:", error);
//   }
// }

// async function sendDriverNotifications(ride, driver) {
//   console.log(`Sending notifications for ride ${ride.id} to driver ${driver.id}`);
//   const driverDetails = await prisma.drivers.findUnique({
//     where: { id: driver.id },
//   });
//   console.log("Driver details for notifications:", driverDetails);
//   const notificationPayload = {
//     to: driverDetails.expo_token,
//     title: "New Ride Request!",
//     body: "New ride available nearby",
//     priority: "high",
//     useFcmV1: true,
//     channelId: "ride_alerts",
//     sound: "ride_ring",
//     data: { rideData: { ...ride, assigned_driver_id: driver.id } },
//   };
//   const notification2Payload = {
//     to: driverDetails.expo_token,
//     content_available: true,
//     priority: "high",
//     data: { rideData: { ...ride, assigned_driver_id: driver.id } },
//   };

//   console.log("Sending primary notification:", notificationPayload);
//   await expo.sendPushNotificationsAsync([notificationPayload]);
//   console.log("Sending secondary notification:", notification2Payload);
//   await expo.sendPushNotificationsAsync([notification2Payload]);
//   console.log("Driver notifications sent successfully.");
// }

// async function updateRideStatus(rideId, status) {
//   console.log(`Updating ride ${rideId} status to ${status}`);
//   const ride = await prisma.rides.update({
//     where: { id: rideId },
//     data: { status: status },
//   });
//   console.log("Ride status updated:", ride);
//   return ride;
// }

// function unauthorizedResponse() {
//   console.log("Returning unauthorized response.");
//   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// }

// function notFoundResponse(entity) {
//   console.log(`Returning not found response for ${entity}.`);
//   return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
// }

// function badRequestResponse() {
//   console.log("Returning bad request response.");
//   return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
// }

// function serverErrorResponse() {
//   console.log("Returning server error response.");
//   return NextResponse.json({ error: "Internal server error" }, { status: 500 });
// }
