import React from "react";
import Breadcrumb from "@/components/Breadcrumb";
import VehicleTypeForm from "@/components/VehicleTypeForm";

export default function AddVehicleType() {
  return (
    <>
      <Breadcrumb title="Add New Vehicle Type" />
      <VehicleTypeForm />
    </>
  );
}
