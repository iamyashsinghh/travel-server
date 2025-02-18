import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";

export default async function Viewpage({ params }) {
  await requireAdminAuth(["users.manage"]);

  const { id } = params;
  if (!id) {
    return <p>Error: User ID is required.</p>;
  }

  const user = await prisma.users.findUnique({
    where: { id: Number(id) },
  });

  if (!user) {
    return <p>Error: User not found.</p>;
  }

  // Format date function
  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) : "N/A";
  };

  return (
    <>
      <Breadcrumb title="User Details" />
      <div className="card shadow-sm p-5">
        <div className="row">
          <div className="col-md-6">
            <dl className="row">

            <dt className="col-sm-4">Active Status</dt>
            <dd className="col-sm-8">{user.active ? "Yes" : "No"}</dd>

              <dt className="col-sm-4">Name:</dt>
              <dd className="col-sm-8">{user.name}</dd>

              <dt className="col-sm-4">User Name</dt>
              <dd className="col-sm-8">{user.username}</dd>

              <dt className="col-sm-4">Email:</dt>
              <dd className="col-sm-8">{user.email}</dd>

              <dt className="col-sm-4">Mobile No:</dt>
              <dd className="col-sm-8">{user.mobile}</dd>

              <dt className="col-sm-4">Gender</dt>
              <dd className="col-sm-8">{user.gender}</dd>

              <dt className="col-sm-4">Referral Code:</dt>
              <dd className="col-sm-8">{user.refferal_code}</dd>
            </dl>
          </div>
          <div className="col-md-6">
            <dl className="row">
              

              <dt className="col-sm-4">Email Confirmed:</dt>
              <dd className="col-sm-8">{user.email_confirmed ? "Yes" : "No"}</dd>


              <dt className="col-sm-4">Rating Total:</dt>
              <dd className="col-sm-8">{user.rating_total}</dd>

              <dt className="col-sm-4">No of Ratings:</dt>
              <dd className="col-sm-8">{user.no_of_ratings}</dd>

              <dt className="col-sm-4">Login By:</dt>
              <dd className="col-sm-8">{user.login_by}</dd>

              <dt className="col-sm-4">Last known IP:</dt>
              <dd className="col-sm-8">{user.last_known_ip}</dd>

              <dt className="col-sm-4">Last Login:</dt>
              <dd className="col-sm-8">{formatDate(user.last_login_at)}</dd>

              <dt className="col-sm-4">Created At:</dt>
              <dd className="col-sm-8">{formatDate(user.created_at)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
