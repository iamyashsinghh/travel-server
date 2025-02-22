import React from "react";
import { prisma } from "@/lib/prisma";
import Breadcrumb from "@/components/Breadcrumb";
import { requireAdminAuth } from "@/hooks/permission";
import VehiclesListTable from "@/components/VehiclesListTable";

export default async function VehicleListPage({ searchParams }) {
  await requireAdminAuth(["vehicles.manage"]);

  const pageSize = 10;
  const currentPage = parseInt(searchParams?.page || "1");
  const searchQuery = searchParams?.search?.trim() || "";

  // Simple search filter on the vehicle name
  const whereClause = searchQuery ? { name: { contains: searchQuery.toLowerCase(), } } : {};

  const totalVehicles = await prisma.vehicle.count({ where: whereClause });
  const vehicles = await prisma.vehicle.findMany({
    where: whereClause,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: { driver: true, vehicle_type: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumb title="Vehicles Management" />
      <VehiclesListTable
        vehicles={vehicles}
        totalVehicles={totalVehicles}
        currentPage={currentPage}
        currentSearch={searchQuery}
      />
    </>
  );
}
