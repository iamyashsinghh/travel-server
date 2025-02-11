import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";
import UsersListTable from "@/components/UsersListTable";

export default async function AdminListPage({ searchParams }) {
  await requireAdminAuth(["users.manage"]);

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

  const totalUsers = await prisma.users.count({ where: whereClause });

  const users = await prisma.users.findMany({
    where: whereClause,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumb title={"Users Management"} />
      <UsersListTable
        users={users}
        totalUsers={totalUsers}
        currentPage={currentPage}
        currentSearch={searchQuery}
      />
    </>
  );
}