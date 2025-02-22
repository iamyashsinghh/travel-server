"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";

const DriversListTable = ({
  drivers,
  totalDrivers,
  currentPage,
  currentSearch,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 10;
  const totalPages = Math.ceil(totalDrivers / pageSize);

  const [searchTerm, setSearchTerm] = useState(currentSearch || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounced Search Effect (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearchTerm !== currentSearch) {
        const query = new URLSearchParams(searchParams.toString());
        query.set("search", debouncedSearchTerm);
        query.set("page", "1");
        router.push(`/drivers?${query.toString()}`);
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
    router.push("/drivers");
  };

  const handlePagination = (newPage) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", newPage);
    router.push(`/drivers?${query.toString()}`);
  };

  const handleDelete = async (driverId) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        const response = await fetch(`/api/drivers/${driverId}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          router.refresh();
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  return (
    <div className="card shadow-sm rounded p-3">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <div className="d-flex">
          <h4 className="mb-0">Drivers List</h4>
          <Link
            href="/drivers/add"
            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2 mx-3"
          >
            <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
            Add New Driver
          </Link>
        </div>
        <div className="d-flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search drivers..."
            className="form-control"
          />
          {searchTerm && (
            <button className="btn btn-outline-secondary" onClick={handleResetSearch}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="table-light">
              <tr>
                <th>S.L</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Gender</th>
                <th>Active</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length ? (
                drivers.map((driver, index) => (
                  <tr key={driver.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{driver.name}</td>
                    <td>{driver.email}</td>
                    <td>{driver.mobile}</td>
                    <td>{driver.gender}</td>
                    <td>{driver.active ? "Yes" : "No"}</td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <Link
                          href={`/drivers/view/${driver.id}`}
                          className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        >
                          <Icon icon="majesticons:eye-line" className="icon text-xl" />
                        </Link>
                        <Link
                          href={`/drivers/edit/${driver.id}`}
                          className="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        >
                          <Icon icon="lucide:edit" className="menu-icon" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(driver.id)}
                          className="bg-danger-focus text-danger-600 bg-hover-danger-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        >
                          <Icon icon="fluent:delete-24-regular" className="fs-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {(currentPage - 1) * pageSize + drivers.length} of {totalDrivers} entries
          </span>
          <ul className="pagination mb-0">
            {Array.from({ length: totalPages }, (_, i) => (
              <li
                className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                key={i}
              >
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

export default DriversListTable;