"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import permissions from "@/permissions.json";
import roles from "@/roles.json";

const AdminForm = ({ admin }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (admin) {
      setValue("name", admin.name);
      setValue("email", admin.email);
      setValue("role", admin.role);
      setValue("permissions", admin.permissions.map((p) => p.id));
    }
  }, [admin, setValue]);

  const onSubmit = async (data) => {
    try {
      const url = admin ? `/api/admins/${admin.id}` : "/api/admins";
      const method = admin ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push("/admins");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <div className="card shadow-sm rounded p-3">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5">
        {/* Name Field */}
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            {...register("name", { required: true })}
            className={`form-control ${errors.name ? "is-invalid" : ""}`}
          />
          {errors.name && <div className="invalid-feedback">Name is required</div>}
        </div>

        {/* Email Field */}
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            {...register("email", { required: true })}
            className={`form-control ${errors.email ? "is-invalid" : ""}`}
          />
          {errors.email && <div className="invalid-feedback">Valid email is required</div>}
        </div>

        {/* Role Selection (Dynamic from roles.json) */}
        <div className="mb-3">
          <label className="form-label">Role</label>
          <select
            {...register("role", { required: true })}
            className={`form-select ${errors.role ? "is-invalid" : ""}`}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.role && <div className="invalid-feedback">Role is required</div>}
        </div>

        {/* Permissions (Dynamic from permissions.json) */}
        <div className="mb-3">
          <label className="form-label">Permissions</label>
          <div className="row">
            {permissions.map((perm) => (
              <div className="col-md-4" key={perm.id}>
                <div className="form-check">
                  <input
                    type="checkbox"
                    value={perm.id}
                    {...register("permissions")}
                    className="form-check-input"
                    id={perm.id}
                  />
                  <label className="form-check-label" htmlFor={perm.id}>
                    {perm.name}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Password Field (Only for new admin) */}
        {!admin && (
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              {...register("password", { required: !admin })}
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
            />
            {errors.password && <div className="invalid-feedback">Password is required</div>}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className="btn btn-primary">
          {admin ? "Update Admin" : "Create Admin"}
        </button>
      </form>
    </div>
  );
};

export default AdminForm;
