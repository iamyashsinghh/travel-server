import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";

export default async function ViewAdmin({ params }) {
  await requireAdminAuth(["admin.manage"]);

    const { id } = params; 
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
      <Breadcrumb title="Admin Details" />
      <div className="card shadow-sm p-4">
        <div className="row">
          <div className="col-md-6">
            <h4>Admin Information</h4>
            <dl className="row">
              <dt className="col-sm-4">Name:</dt>
              <dd className="col-sm-8">{admin.name}</dd>

              <dt className="col-sm-4">Email:</dt>
              <dd className="col-sm-8">{admin.email}</dd>

              <dt className="col-sm-4">Role:</dt>
              <dd className="col-sm-8">{admin.role}</dd>
            </dl>
          </div>
          <div className="col-md-6">
            <h4>Permissions</h4>
            <ul className="list-group">
              {admin.permissions.map((perm) => (
                <li key={perm.id} className="list-group-item">
                  {perm.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>);
}