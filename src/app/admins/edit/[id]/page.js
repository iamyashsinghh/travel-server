import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import AdminForm from "@/components/AdminForm";
import Breadcrumb from "@/components/Breadcrumb";

export default async function EditAdmin({ params }) {
  await requireAdminAuth(["admin.manage"]);

  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  if (!id) {
    return <p>Error: Admin ID is required.</p>;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: Number(id) },
    include: { permissions: true },
  });

  if (!admin) {
    return <p>Error: Admin not found.</p>;
  }

  return (
    <>
      <Breadcrumb title="Edit Admin" />
      <AdminForm admin={admin} />
    </>
  );
}
