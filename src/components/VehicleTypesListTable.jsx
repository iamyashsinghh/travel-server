"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

const VehicleTypesListTable = ({ vehicleTypes, totalVehicleTypes, currentPage, currentSearch }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 10;
  const totalPages = Math.ceil(totalVehicleTypes / pageSize);
  const [searchTerm, setSearchTerm] = useState(currentSearch || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearchTerm !== currentSearch) {
        const query = new URLSearchParams(searchParams.toString());
        query.set("search", debouncedSearchTerm);
        query.set("page", "1");
        router.push(`/vehicle_types?${query.toString()}`);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [debouncedSearchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setDebouncedSearchTerm(e.target.value);
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    router.push("/vehicle_types");
  };

  const handlePagination = (newPage) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", newPage);
    router.push(`/vehicle_types?${query.toString()}`);
  };

  const handleDelete = async (vehicleTypeId) => {
    if (window.confirm("Are you sure you want to delete this vehicle type?")) {
      try {
        const response = await fetch(`/api/vehicle_types/${vehicleTypeId}`, { method: "DELETE" });
        if (response.ok) {
          toast.success("Vehicle type deleted successfully!");
          router.refresh();
        } else {
          toast.error("Failed to delete vehicle type");
        }
      } catch (error) {
        console.error("Delete vehicle type error:", error);
        toast.error("Delete error");
      }
    }
  };

  return (
    <div className="card shadow-sm rounded p-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h4 className="mb-0">Vehicle Types List</h4>
        <Link href="/vehicle_types/add" className="btn btn-primary">
          <Icon icon="ic:baseline-plus" className="icon" /> Add New Vehicle Type
        </Link>
      </div>
      <div className="card-body">
        <div className="d-flex mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search vehicle types..."
            className="form-control"
          />
          {searchTerm && (
            <button className="btn btn-outline-secondary ms-2" onClick={handleResetSearch}>
              Reset
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>S.L</th>
                <th>Name</th>
                <th>Icon</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.length ? (
                vehicleTypes.map((vt, index) => (
                  <tr key={vt.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{vt.name}</td>
                    <td>
                      {vt.icon ? <img src={`/${vt.icon}`} alt={vt.name} width="50" height="50" /> : "N/A"}
                    </td>
                    <td>{vt.status}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link href={`/vehicle_types/view/${vt.id}`} className="btn btn-info btn-sm">
                          <Icon icon="majesticons:eye-line" />
                        </Link>
                        <Link href={`/vehicle_types/edit/${vt.id}`} className="btn btn-success btn-sm">
                          <Icon icon="lucide:edit" />
                        </Link>
                        <button onClick={() => handleDelete(vt.id)} className="btn btn-danger btn-sm">
                          <Icon icon="fluent:delete-24-regular" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    No vehicle types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {(currentPage - 1) * pageSize + vehicleTypes.length} of {totalVehicleTypes} entries
          </span>
          <ul className="pagination mb-0">
            {Array.from({ length: totalPages }, (_, i) => (
              <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                <button className="page-link" onClick={() => handlePagination(i + 1)}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VehicleTypesListTable;
