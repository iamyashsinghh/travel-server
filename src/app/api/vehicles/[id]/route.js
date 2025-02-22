import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

// GET a single vehicle by id
export async function GET(request, { params }) {
  if (!(await requireAllAdminAuth(["vehicles.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(id) },
      include: { driver: true, vehicle_type: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("GET vehicle Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching vehicle: " + error.message },
      { status: 500 }
    );
  }
}

// PUT (update) a vehicle
export async function PUT(request, { params }) {
  if (!(await requireAllAdminAuth(["vehicles.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = params;
    const formData = await request.formData();
    const data = {};
    // Process all fields except "image"
    for (const [key, value] of formData.entries()) {
      if (key !== "image") {
        data[key] = value;
      }
    }

    let imagePath = "";
    // Use getAll to ensure we pick the actual File instance from the FileList
    const files = formData.getAll("image");
    const file = files.find(item => item instanceof File);
    if (file && file.size > 0) {
      const originalName = file.name;
      const extension = originalName.split(".").pop();
      const newFileName = `${Date.now()}.${extension || "jpg"}`;
      const filePath = path.join("uploads", newFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(process.cwd(), "public", filePath), buffer);
      imagePath = filePath;
      console.log("PUT: Image uploaded, filePath:", imagePath);
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: Number(id) },
      data: {
        driver_id: data.driver_id ? Number(data.driver_id) : undefined,
        vehicle_type_id: data.vehicle_type_id ? Number(data.vehicle_type_id) : undefined,
        name: data.name,
        image: imagePath ? imagePath : undefined, // update only if a new image was uploaded
        license_plate: data.license_plate || undefined,
        details: data.details || undefined,
      },
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error("PUT vehicle Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error updating vehicle: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE a vehicle by id
export async function DELETE(request, { params }) {
  if (!(await requireAllAdminAuth(["vehicles.delete"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = params;
    await prisma.vehicle.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE vehicle Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error deleting vehicle: " + error.message },
      { status: 500 }
    );
  }
}
