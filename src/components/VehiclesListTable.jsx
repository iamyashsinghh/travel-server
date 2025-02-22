"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

const VehiclesListTable = ({ vehicles, totalVehicles, currentPage, currentSearch }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 10;
  const totalPages = Math.ceil(totalVehicles / pageSize);
  const [searchTerm, setSearchTerm] = useState(currentSearch || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearchTerm !== currentSearch) {
        const query = new URLSearchParams(searchParams.toString());
        query.set("search", debouncedSearchTerm);
        query.set("page", "1");
        router.push(`/vehicles?${query.toString()}`);
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
    router.push("/vehicles");
  };

  const handlePagination = (newPage) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", newPage);
    router.push(`/vehicles?${query.toString()}`);
  };

  const handleDelete = async (vehicleId) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
        if (response.ok) {
          toast.success("Vehicle deleted successfully!");
          router.refresh();
        } else {
          toast.error("Failed to delete vehicle");
        }
      } catch (error) {
        console.error("Delete vehicle error:", error);
        toast.error("Delete error");
      }
    }
  };

  return (
    <div className="card shadow-sm rounded p-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h4 className="mb-0">Vehicles List</h4>
        <Link href="/vehicles/add" className="btn btn-primary">
          <Icon icon="ic:baseline-plus" className="icon" /> Add New Vehicle
        </Link>
      </div>
      <div className="card-body">
        <div className="d-flex mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search vehicles..."
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
                <th>Driver</th>
                <th>Icon</th>
                <th>Type</th>
                <th>License Plate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length ? (
                vehicles.map((vehicle, index) => (
                  <tr key={vehicle.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{vehicle.name}</td>
                    <td>{vehicle.driver?.name || "N/A"}</td>
                    <td>
                      {vehicle.image ? <img src={`/${vehicle.image}`} alt={vehicle.name} width="50" height="50" /> : "N/A"}
                    </td>
                    <td>{vehicle.vehicle_type?.name || "N/A"}</td>
                    
                    <td>{vehicle.license_plate || "-"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link href={`/vehicles/view/${vehicle.id}`} className="btn btn-info btn-sm">
                          <Icon icon="majesticons:eye-line" />
                        </Link>
                        <Link href={`/vehicles/edit/${vehicle.id}`} className="btn btn-success btn-sm">
                          <Icon icon="lucide:edit" />
                        </Link>
                        <button onClick={() => handleDelete(vehicle.id)} className="btn btn-danger btn-sm">
                          <Icon icon="fluent:delete-24-regular" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No vehicles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {(currentPage - 1) * pageSize + vehicles.length} of {totalVehicles} entries
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

export default VehiclesListTable;
