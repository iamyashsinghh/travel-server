import React from "react";
import { prisma } from "@/lib/prisma";
import VehicleTypesListTable from "@/components/VehicleTypesListTable";
import Breadcrumb from "@/components/Breadcrumb";
import { requireAdminAuth } from "@/hooks/permission";

export default async function VehicleTypesListPage({ searchParams }) {
  await requireAdminAuth(["vehicle_types.manage"]);

  const pageSize = 10;
  const currentPage = parseInt(searchParams?.page || "1");
  const searchQuery = searchParams?.search?.trim() || "";
  const whereClause = searchQuery ? { name: { contains: searchQuery.toLowerCase() } } : {};

  const totalVehicleTypes = await prisma.vehicle_types.count({ where: whereClause });
  const vehicleTypes = await prisma.vehicle_types.findMany({
    where: whereClause,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumb title="Vehicle Types Management" />
      <VehicleTypesListTable
        vehicleTypes={vehicleTypes}
        totalVehicleTypes={totalVehicleTypes}
        currentPage={currentPage}
        currentSearch={searchQuery}
      />
    </>
  );
}
