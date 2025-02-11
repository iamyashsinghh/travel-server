"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const UserForm = ({ user }) => {
  const router = useRouter();
  const [preview, setPreview] = useState(
    user?.profile_picture ? `/${user.profile_picture}` : null
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
      gender: user?.gender || "",
      active: user?.active || false,
      email_confirmed: user?.email_confirmed || false,
      mobile_confirmed: user?.mobile_confirmed || false,
      refferal_code: user?.refferal_code || generateReferralCode(),
    },
  });

  useEffect(() => {
    if (user) {
      Object.keys(user).forEach((key) => {
        if (key !== "profile_picture") {
          setValue(key, user[key]);
        }
      });
      setValue("refferal_code", user.refferal_code || generateReferralCode());
    }
  }, [user, setValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  };

  const onSubmit = async (data) => {
    try {
      const url = user ? `/api/users/${user.id}` : "/api/users";
      const method = user ? "PUT" : "POST";
      const formData = new FormData();
      for (const key in data) {
        if (key === "profile_picture") {
          if (data.profile_picture && data.profile_picture.length > 0) {
            formData.append(key, data.profile_picture[0]);
          }
        } else {
          formData.append(key, data[key]);
        }
      }
      const response = await fetch(url, {
        method,
        body: formData,
      });
      if (response.ok) {
        router.push("/users");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <div className="card shadow rounded p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4"
        encType="multipart/form-data"
      >
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                {...register("username", { required: true })}
                className={`form-control ${errors.username ? "is-invalid" : ""}`}
              />
              {errors.username && (
                <div className="invalid-feedback">Username is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                {...register("name", { required: true })}
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
              />
              {errors.name && (
                <div className="invalid-feedback">Name is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                {...register("email", { required: true })}
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
              />
              {errors.email && (
                <div className="invalid-feedback">Valid email is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Mobile</label>
              <input
                type="number"
                {...register("mobile", { required: true })}
                className={`form-control ${errors.mobile ? "is-invalid" : ""}`}
              />
              {errors.mobile && (
                <div className="invalid-feedback">Valid mobile is required</div>
              )}
            </div>
          </div>
          <div className="col-md-6">
            {/* Gender, toggles, and other fields */}
            <div className="mb-3">
              <label className="form-label">Gender</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    value="male"
                    {...register("gender", { required: true })}
                  />
                  <label className="form-check-label">Male</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    value="female"
                    {...register("gender", { required: true })}
                  />
                  <label className="form-check-label">Female</label>
                </div>
              </div>
              {errors.gender && (
                <div className="text-danger">Gender is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label d-block">User Status</label>
              <div className="d-flex flex-column gap-2">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    {...register("active")}
                  />
                  <label className="form-check-label">Active User</label>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    {...register("email_confirmed")}
                  />
                  <label className="form-check-label">Email Verified</label>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    {...register("mobile_confirmed")}
                  />
                  <label className="form-check-label">Mobile Verified</label>
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Referral Code</label>
              <input
                type="text"
                {...register("refferal_code")}
                className="form-control"
                readOnly
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Profile Picture</label>
              <div className="d-flex align-items-center gap-3">
                {preview && (
                  <img
                    src={preview}
                    alt="Profile Preview"
                    className="rounded-circle border shadow-sm"
                    width="80"
                    height="80"
                  />
                )}
                <input
                  type="file"
                  {...register("profile_picture")}
                  onChange={handleFileChange}
                  className="form-control"
                  accept="image/*"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <button type="submit" className="btn btn-primary px-4 py-2">
            {user ? "Update User" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
