import React from "react";
import Breadcrumb from "@/components/Breadcrumb";
import VehicleForm from "@/components/VehicleForm";
import { prisma } from "@/lib/prisma";

export default async function EditVehicle({ params }) {
  const { id } = params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(id) },
  });

  if (!vehicle) {
    return <p>Vehicle not found.</p>;
  }

  const drivers = await prisma.drivers.findMany({ select: { id: true, name: true } });
  const vehicleTypes = await prisma.vehicle_type.findMany({ select: { id: true, name: true } });

  return (
    <>
      <Breadcrumb title="Edit Vehicle" />
      <VehicleForm vehicle={vehicle} driversOptions={drivers} vehicleTypesOptions={vehicleTypes} />
    </>
  );
}
