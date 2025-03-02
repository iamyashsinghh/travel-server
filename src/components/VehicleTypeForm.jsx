"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const VehicleTypeForm = ({ vehicleType }) => {
  const router = useRouter();
  const [iconPreview, setIconPreview] = useState(vehicleType?.icon ? `/${vehicleType.icon}` : null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: vehicleType?.name || "",
      no_of_person: vehicleType?.no_of_person || 4,
      status: vehicleType?.status || "start_riding"
    }
  });

  useEffect(() => {
    if (vehicleType) {
      Object.keys(vehicleType).forEach(key => {
        if (key !== "icon") {
          setValue(key, vehicleType[key]);
        }
      });
    }
  }, [vehicleType, setValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    try {
      const url = vehicleType ? `/api/vehicle_types/${vehicleType.id}` : `/api/vehicle_types`;
      const method = vehicleType ? "PUT" : "POST";
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      if (data.icon && data.icon[0]) {
        formData.append("icon", data.icon[0]);
      }
      const response = await fetch(url, {
        method,
        body: formData,
      });
      if (response.ok) {
        toast.success(`Vehicle type ${vehicleType ? "updated" : "created"} successfully!`);
        router.push('/vehicle_types');
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
          <label className="form-label">Name</label>
          <input {...register("name", { required: true })} className="form-control" />
          {errors.name && <span className="text-danger">Name is required</span>}
        </div>
        <div className="mb-3">
          <label className="form-label">No Of Person</label>
          <input {...register("no_of_person", { required: true })} className="form-control" />
          {errors.no_of_person && <span className="text-danger">No Of Person is required</span>}
        </div>
        <div className="mb-3">
          <label className="form-label">Status</label>
          <select {...register("status", { required: true })} className="form-select">
            <option value="start_riding">Start Riding</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Icon</label>
          <div className="d-flex align-items-center gap-3">
            {iconPreview && <img src={iconPreview} alt="Icon Preview" className="img-thumbnail" width="100" height="100" />}
            <input type="file" {...register("icon")} onChange={handleFileChange} className="form-control" accept="image/*" />
          </div>
        </div>
        <div className="text-center">
          <button type="submit" className="btn btn-primary">
            {vehicleType ? "Update Vehicle Type" : "Create Vehicle Type"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleTypeForm;
