"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const VehicleForm = ({ vehicle, driversOptions = [], vehicleTypesOptions = [] }) => {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(vehicle?.image ? `/${vehicle.image}` : null);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      driver_id: vehicle?.driver_id || "",
      vehicle_type_id: vehicle?.vehicle_type_id || "",
      name: vehicle?.name || "",
      license_plate: vehicle?.license_plate || "",
      details: vehicle?.details || "",
    }
  });

  useEffect(() => {
    if (vehicle) {
      Object.keys(vehicle).forEach((key) => {
        if (key !== "image") {
          setValue(key, vehicle[key]);
        }
      });
    }
  }, [vehicle, setValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    try {
      const url = vehicle ? `/api/vehicles/${vehicle.id}` : `/api/vehicles`;
      const method = vehicle ? "PUT" : "POST";
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      if (data.image && data.image[0]) {
        formData.append("image", data.image[0]);
      }
      const response = await fetch(url, {
        method,
        body: formData,
      });
      if (response.ok) {
        toast.success(`Vehicle ${vehicle ? "updated" : "created"} successfully!`);
        router.push('/vehicles');
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      toast.error("Error submitting form");
      console.error("Form error:", error);
    }
  };

  return (
    <div className="card shadow rounded p-4">
      <form onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
        <div className="mb-3">
          <label className="form-label">Driver</label>
          <select {...register("driver_id", { required: true })} className="form-select">
            <option value="">Select Driver</option>
            {driversOptions.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          {errors.driver_id && <span className="text-danger">Driver is required</span>}
        </div>
        <div className="mb-3">
          <label className="form-label">Vehicle Type</label>
          <select {...register("vehicle_type_id", { required: true })} className="form-select">
            <option value="">Select Vehicle Type</option>
            {vehicleTypesOptions.map(vt => (
              <option key={vt.id} value={vt.id}>
                {vt.name}
              </option>
            ))}
          </select>
          {errors.vehicle_type_id && <span className="text-danger">Vehicle type is required</span>}
        </div>
        <div className="mb-3">
          <label className="form-label">Vehicle Name</label>
          <input {...register("name", { required: true })} className="form-control" />
          {errors.name && <span className="text-danger">Name is required</span>}
        </div>
        <div className="mb-3">
          <label className="form-label">License Plate</label>
          <input {...register("license_plate")} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Details</label>
          <textarea {...register("details")} className="form-control" rows="3" />
        </div>
        <div className="mb-3">
          <label className="form-label">Vehicle Image</label>
          <div className="d-flex align-items-center gap-3">
            {imagePreview && (
              <img src={imagePreview} alt="Vehicle Preview" className="img-thumbnail" width="100" height="100" />
            )}
            <input
              type="file"
              {...register("image")}
              onChange={handleFileChange}
              className="form-control"
              accept="image/*"
            />
          </div>
        </div>
        <div className="text-center">
          <button type="submit" className="btn btn-primary">
            {vehicle ? "Update Vehicle" : "Create Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleForm;
