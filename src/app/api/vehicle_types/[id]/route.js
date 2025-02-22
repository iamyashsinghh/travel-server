import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

// GET a single vehicle type
export async function GET(request, context) {
  const { params } = context;
  if (!(await requireAllAdminAuth(["vehicle_types.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const id = params.id;
    const vehicleType = await prisma.vehicle_type.findUnique({
      where: { id: Number(id) },
      include: { vehicles: true },
    });
    if (!vehicleType) {
      return NextResponse.json({ error: "Vehicle type not found" }, { status: 404 });
    }
    return NextResponse.json(vehicleType);
  } catch (error) {
    console.error("GET vehicle type Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching vehicle type: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  const { params } = context;
  if (!(await requireAllAdminAuth(["vehicle_types.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const id = params.id;
    const formData = await request.formData();
    const data = {};
    // Process all fields except "icon"
    for (const [key, value] of formData.entries()) {
      if (key !== "icon") {
        data[key] = value;
      }
    }

    let iconPath = "";
    // Retrieve all values for "icon" and select the File object
    const files = formData.getAll("icon");
    const file = files.find((item) => item instanceof File);
    if (file && file.size > 0) {
      const originalName = file.name;
      const extension = originalName.split(".").pop();
      const newFileName = `${Date.now()}.${extension || "jpg"}`;
      const filePath = path.join("uploads", newFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(process.cwd(), "public", filePath), buffer);
      iconPath = filePath;
      console.log("PUT: Icon updated, filePath:", iconPath);
    }

    const updatedVehicleType = await prisma.vehicle_type.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        // Only update the icon if a new file was provided; otherwise leave unchanged
        icon: iconPath ? iconPath : undefined,
        status: data.status || undefined,
      },
    });

    return NextResponse.json(updatedVehicleType);
  } catch (error) {
    console.error("PUT vehicle type Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error updating vehicle type: " + error.message },
      { status: 500 }
    );
  }
}


// DELETE a vehicle type
export async function DELETE(request, context) {
  const { params } = context;
  if (!(await requireAllAdminAuth(["vehicle_types.delete"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const id = params.id;
    await prisma.vehicle_type.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE vehicle type Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error deleting vehicle type: " + error.message },
      { status: 500 }
    );
  }
}
