import React from "react";
import Breadcrumb from "@/components/Breadcrumb";
import VehicleTypeForm from "@/components/VehicleTypeForm";
import { prisma } from "@/lib/prisma";

export default async function EditVehicleType({ params }) {
  const { id } = params;
  const vehicleType = await prisma.vehicle_types.findUnique({
    where: { id: Number(id) },
  });

  if (!vehicleType) {
    return <p>Vehicle type not found.</p>;
  }

  return (
    <>
      <Breadcrumb title="Edit Vehicle Type" />
      <VehicleTypeForm vehicleType={vehicleType} />
    </>
  );
}
