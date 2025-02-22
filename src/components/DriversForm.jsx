"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const DriverForm = ({ driver }) => {
  const router = useRouter();
  const [preview, setPreview] = useState(
    driver?.profile_picture ? `/${driver.profile_picture}` : null
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: driver?.name || "",
      mobile: driver?.mobile || "",
      current_address: driver?.current_address || "",
      address: driver?.address || "",
      age: driver?.age || "",
      email: driver?.email || "",
      mobile: driver?.mobile || "",
      alt_mobile: driver?.alt_mobile || "",
      gender: driver?.gender || "",
      active: driver?.active || false,
      dob: driver?.dob || "",
    },
  });

  useEffect(() => {
    if (driver) {
      Object.keys(driver).forEach((key) => {
        if (key !== "profile_picture") {
          setValue(key, driver[key]);
        }
      });
    }
  }, [driver, setValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  };

  const onSubmit = async (data) => {
    try {
      const url = driver ? `/api/drivers/${driver.id}` : "/api/drivers";
      const method = driver ? "PUT" : "POST";
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
        toast.success("Driver updated successfully!");
        router.push('/drivers')
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch (error) {
      toast.error("Internal server error!");
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
              <label className="form-label">Driver Name</label>
              <input
                {...register("name", { required: true })}
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
              />
              {errors.name && (
                <div className="invalid-feedback">Driver Name is required</div>
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
            
            <div className="mb-3">
              <label className="form-label">Permanent Address</label>
              <input
                {...register("current_address", { required: true })}
                className={`form-control ${errors.current_address ? "is-invalid" : ""}`}
              />
              {errors.current_address && (
                <div className="invalid-feedback">Permanent Address is required</div>
              )}
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
              <div className="mb-3">
              <label className="form-label">Gender</label>
              <div className="d-flex gap-3">
                <label className="form-check-label">
                  <input
                    type="radio"
                    {...register("gender", { required: true })}
                    value="male"
                    className="form-check-input"
                  />
                  Male
                </label>
                <label className="form-check-label">
                  <input
                    type="radio"
                    {...register("gender", { required: true })}
                    value="female"
                    className="form-check-input"
                  />
                  Female
                </label>
                <label className="form-check-label">
                  <input
                    type="radio"
                    {...register("gender", { required: true })}
                    value="other"
                    className="form-check-input"
                  />
                  Other
                </label>
              </div>
              {errors.gender && (
                <div className="invalid-feedback d-block">Gender is required</div>
              )}
            </div>
            </div>
          </div>
          <div className="col-md-6">
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
              <label className="form-label">Alternative Mobile</label>
              <input
                type="number"
                {...register("alt_mobile", { required: true })}
                className={`form-control ${errors.mobile ? "is-invalid" : ""}`}
              />
              {errors.mobile && (
                <div className="invalid-feedback">Valid mobile is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Address</label>
              <input
                {...register("address", { required: true })}
                className={`form-control ${errors.address ? "is-invalid" : ""}`}
              />
              {errors.address && (
                <div className="invalid-feedback">Address is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Age</label>
              <input
                type="number"
                {...register("age", { required: true })}
                className={`form-control ${errors.age ? "is-invalid" : ""}`}
              />
              {errors.age && (
                <div className="invalid-feedback">Age is required</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                {...register("dob", { required: true })}
                className={`form-control ${errors.dob ? "is-invalid" : ""}`}
              />
              {errors.dob && (
                <div className="invalid-feedback">Date of Birth is required</div>
              )}
            </div>
            
          </div>
        </div>
        <div className="text-center mt-4">
          <button type="submit" className="btn btn-primary px-4 py-2">
            {driver ? "Update Driver" : "Create Driver"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
