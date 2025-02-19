import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";
import DriverForm from "@/components/DriversForm";

export default async function EditAdmin({ params }) {
  await requireAdminAuth(["driver.manage"]);

  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  if (!id) {
    return <p>Error: driver ID is required.</p>;
  }

  const driver = await prisma.drivers.findUnique({
    where: { id: Number(id) },
  });

  if (!driver) {
    return <p>Error: driver not found.</p>;
  }

  return (
    <>
      <Breadcrumb title="Edit driver" />
      <DriverForm driver={driver} />
    </>
  );
}
