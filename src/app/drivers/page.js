import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";
import DriversListTable from "@/components/DriversListTable";

export default async function AdminListPage({ searchParams }) {
  await requireAdminAuth(["drivers.manage"]);

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const pageSize = 10;
  const currentPage = parseInt(resolvedSearchParams?.page || "1");
  const searchQuery = resolvedSearchParams?.search?.trim() || "";
  const isPostgreSQL = prisma._clientMeta?.provider === "postgresql";

  const whereClause = searchQuery
    ? {
        OR: isPostgreSQL
          ? [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { email: { contains: searchQuery, mode: "insensitive" } },
            ]
          : [
              { name: { contains: searchQuery.toLowerCase() } },
              { email: { contains: searchQuery.toLowerCase() } },
            ],
      }
    : {};

  const totalDrivers = await prisma.drivers.count({ where: whereClause });

  const drivers = await prisma.drivers.findMany({
    where: whereClause,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumb title={"Drivers Management"} />
      <DriversListTable
        drivers={drivers}
        totalDrivers={totalDrivers}
        currentPage={currentPage}
        currentSearch={searchQuery}
      />
    </>
  );
}