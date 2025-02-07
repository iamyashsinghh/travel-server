import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import AdminListTable from "@/components/AdminListTable";
import Breadcrumb from "@/components/Breadcrumb";

export default async function AdminListPage({ searchParams }) {
  // Ensure the user has the required permission
  await requireAdminAuth(["admin.manage"]);

  // Await searchParams to satisfy Next.js dynamic API rules
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
              { role: { contains: searchQuery, mode: "insensitive" } },
              {
                permissions: {
                  some: { name: { contains: searchQuery, mode: "insensitive" } },
                },
              },
            ]
          : [
              { name: { contains: searchQuery.toLowerCase() } },
              { email: { contains: searchQuery.toLowerCase() } },
              { role: { contains: searchQuery.toLowerCase() } },
              {
                permissions: {
                  some: { name: { contains: searchQuery.toLowerCase() } },
                },
              },
            ],
      }
    : {};

  const totalAdmins = await prisma.admin.count({ where: whereClause });

  const admins = await prisma.admin.findMany({
    where: whereClause,
    include: { permissions: true },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumb title={"Admin Management"} />
      <AdminListTable
        admins={admins}
        totalAdmins={totalAdmins}
        currentPage={currentPage}
        currentSearch={searchQuery}
      />
    </>
  );
}
