import React from "react";
import Breadcrumb from "@/components/Breadcrumb";
import VehicleForm from "@/components/VehicleForm";
import { prisma } from "@/lib/prisma";

export default async function AddVehicle() {
  // Fetch drivers and vehicle types for dropdown options
  const drivers = await prisma.drivers.findMany({ select: { id: true, name: true } });
  const vehicleTypes = await prisma.vehicle_types.findMany({ select: { id: true, name: true } });

  return (
    <>
      <Breadcrumb title="Add New Vehicle" />
      <VehicleForm driversOptions={drivers} vehicleTypesOptions={vehicleTypes} />
    </>
  );
}
