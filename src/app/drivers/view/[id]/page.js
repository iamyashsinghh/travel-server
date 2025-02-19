import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/hooks/permission";
import Breadcrumb from "@/components/Breadcrumb";

export default async function Viewpage({ params }) {
  await requireAdminAuth(["drivers.manage"]);

  const { id } = params;
  if (!id) {
    return <p>Error: Driver ID is required.</p>;
  }

  const driver = await prisma.drivers.findUnique({
    where: { id: Number(id) },
  });

  if (!driver) {
    return <p>Error: driver not found.</p>;
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
      <Breadcrumb title="driver Details" />
      <div className="card shadow-sm p-5">
        <div className="row">
          <div className="col-md-6">
            <dl className="row">

            <dt className="col-sm-4">Active Status</dt>
            <dd className="col-sm-8">{driver.active ? "Yes" : "No"}</dd>

              <dt className="col-sm-4">Name:</dt>
              <dd className="col-sm-8">{driver.name}</dd>

              <dt className="col-sm-4">Email:</dt>
              <dd className="col-sm-8">{driver.email}</dd>

              <dt className="col-sm-4">Mobile No:</dt>
              <dd className="col-sm-8">{driver.mobile}</dd>

              <dt className="col-sm-4">Alt. Mobile No:</dt>
              <dd className="col-sm-8">{driver.alt_mobile}</dd>

              <dt className="col-sm-4">Age:</dt>
              <dd className="col-sm-8">{driver.age}</dd>

              <dt className="col-sm-4">Gender</dt>
              <dd className="col-sm-8">{driver.gender}</dd>

              <dt className="col-sm-4">Date of Birth</dt>
              <dd className="col-sm-8">{driver.dob}</dd>

              <dt className="col-sm-4">Current Address</dt>
              <dd className="col-sm-8">{driver.current_address}</dd>

              <dt className="col-sm-4">Address</dt>
              <dd className="col-sm-8">{driver.address}</dd>


            </dl>
          </div>
          <div className="col-md-6">
            <dl className="row">

              <dt className="col-sm-4">Rating Total:</dt>
              <dd className="col-sm-8">{driver.total_rating}</dd>

              <dt className="col-sm-4">No of Ratings:</dt>
              <dd className="col-sm-8">{driver.number_of_rating}</dd>

              <dt className="col-sm-4">Login By:</dt>
              <dd className="col-sm-8">{driver.login_by}</dd>

              <dt className="col-sm-4">Last Login At:</dt>
              <dd className="col-sm-8">{driver.last_login_at}</dd>

              <dt className="col-sm-4">Last Login:</dt>
              <dd className="col-sm-8">{formatDate(driver.last_log_ip)}</dd>

              <dt className="col-sm-4">Created At:</dt>
              <dd className="col-sm-8">{formatDate(driver.created_at)}</dd>

              <dt className="col-sm-4">Updated At:</dt>
              <dd className="col-sm-8">{formatDate(driver.updated_at)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
