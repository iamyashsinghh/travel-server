import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    const { city, vehicle_type, distance_km, duration_min, ride_date } = body;

    if (!city || !vehicle_type || isNaN(distance_km) || isNaN(duration_min) || !ride_date) {
      return Response.json({ message: 'Missing or invalid request data' }, { status: 400 });
    }

    const rideDateObj = new Date(ride_date);
    const rideHour = rideDateObj.getHours();
    const rideDay = rideDateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Fetch fare rules for the given city and vehicle type
    const fareRule = await prisma.fare_rule.findFirst({
      where: { city, vehicle_type },
      include: { surge_rules: true, scheduled_adjustments: true },
    });

    if (!fareRule) {
      return Response.json({ message: 'Fare rule not found for the specified city and vehicle type' }, { status: 404 });
    }

    // Base fare calculation
    let total_fare =
      fareRule.initial_fee +
      distance_km * fareRule.cost_per_km +
      duration_min * fareRule.cost_per_minute +
      fareRule.booking_fee;

    // Apply surge pricing if applicable
    const applicableSurge = fareRule.surge_rules.find(
      (rule) =>
        rule.start_hour <= rideHour &&
        rule.end_hour > rideHour &&
        rule.days_of_week.split(',').includes(rideDay.toString())
    );

    if (applicableSurge) {
      total_fare *= applicableSurge.multiplier;
    }

    // Apply scheduled adjustments if applicable
    const applicableAdjustment = fareRule.scheduled_adjustments.find(
      (rule) => rule.start_hour <= rideHour && rule.end_hour > rideHour
    );

    if (applicableAdjustment) {
      total_fare += applicableAdjustment.adjustment_fee;
    }

    return Response.json({ total_fare: total_fare.toFixed(2), currency: 'INR' });
  } catch (error) {
    console.error('Error calculating fare:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
