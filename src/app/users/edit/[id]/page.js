import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";
import UserForm from "@/components/UserForm";

export default async function EditAdmin({ params }) {
  await requireAdminAuth(["user.manage"]);

  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  if (!id) {
    return <p>Error: user ID is required.</p>;
  }

  const user = await prisma.users.findUnique({
    where: { id: Number(id) },
  });

  if (!user) {
    return <p>Error: user not found.</p>;
  }

  return (
    <>
      <Breadcrumb title="Edit user" />
      <UserForm user={user} />
    </>
  );
}
