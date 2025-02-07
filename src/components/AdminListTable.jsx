"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";

const AdminListTable = ({
  admins,
  totalAdmins,
  currentPage,
  currentSearch,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 10;
  const totalPages = Math.ceil(totalAdmins / pageSize);

  const [searchTerm, setSearchTerm] = useState(currentSearch || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Modal state
  const [modalData, setModalData] = useState(null);
  const modalRef = useRef(null); // Ref for the Bootstrap modal element

  // Debounced Search Effect (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearchTerm !== currentSearch) {
        const query = new URLSearchParams(searchParams.toString());
        query.set("search", debouncedSearchTerm);
        query.set("page", "1"); // Reset pagination when searching
        router.push(`/admins?${query.toString()}`);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [debouncedSearchTerm]);

  // Handle Input Change for Search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setDebouncedSearchTerm(e.target.value);
  };

  // Handle Reset Search
  const handleResetSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    router.push("/admins"); // Reset search and reload
  };

  // Handle Pagination Click
  const handlePagination = (newPage) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", newPage);
    router.push(`/admins?${query.toString()}`);
  };

  // Handle Open Modal with dynamic import of Bootstrap Modal
  const handleOpenModal = async (permissions, adminName) => {
    setModalData({ permissions, adminName });
    if (modalRef.current) {
      // Dynamically import the Modal class so it only loads on the client side
      const { default: Modal } = await import("bootstrap/js/dist/modal");
      const modalInstance = new Modal(modalRef.current);
      modalInstance.show();
    }
  };

  const handleDelete = async (adminId) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        const response = await fetch(`/api/admins/${adminId}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          router.refresh(); // Refresh the data
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  return (
    <div className="card shadow-sm rounded p-3">
      {/* Header */}
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <div className="d-flex">
          <h4 className="mb-0">Admin List</h4>
          <Link
            href="/admins/add"
            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2 mx-3"
          >
            <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
            Add New Admin
          </Link>
        </div>
        <div className="d-flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search admins..."
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
                <th>Role</th>
                <th>Permissions</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.length ? (
                admins.map((admin, index) => (
                  <tr key={admin.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.role}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenModal(admin.permissions, admin.name)}
                      >
                        View Permissions
                      </button>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <Link
                          href={`/admins/view/${admin.id}`}
                          className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        >
                          <Icon icon="majesticons:eye-line" className="icon text-xl" />
                        </Link>
                        <Link
                          href={`/admins/edit/${admin.id}`}
                          className="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        >
                          <Icon icon="lucide:edit" className="menu-icon" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(admin.id)}
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
                  <td colSpan="6" className="text-center">
                    No admin users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {(currentPage - 1) * pageSize + admins.length} of {totalAdmins} entries
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

      {/* Modal */}
      <div className="modal fade" id="permissionsModal" ref={modalRef} tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{modalData?.adminName}'s Permissions</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {modalData?.permissions.length ? (
                <ul className="list-group">
                  {modalData.permissions.map((perm, index) => (
                    <li key={index} className="list-group-item">
                      {perm.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No permissions assigned.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminListTable;
