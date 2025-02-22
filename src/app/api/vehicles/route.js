import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

// GET all vehicles
export async function GET(request) {
  if (!(await requireAllAdminAuth(["vehicles.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { driver: true, vehicle_type: true },
    });
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("GET vehicles Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching vehicles: " + error.message },
      { status: 500 }
    );
  }
}

// POST (create) a new vehicle
export async function POST(request) {
  if (!(await requireAllAdminAuth(["vehicles.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const data = {};
    // Process all fields except "image"
    for (const [key, value] of formData.entries()) {
      if (key !== "image") {
        data[key] = value;
      }
    }

    // Validate required fields
    const requiredFields = ["driver_id", "vehicle_type_id", "name"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    let imagePath = "";
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
      console.log("POST: Image uploaded, filePath:", imagePath);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: Number(data.driver_id),
        vehicle_type_id: Number(data.vehicle_type_id),
        name: data.name,
        image: imagePath || null,
        license_plate: data.license_plate || null,
        details: data.details || null,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("POST vehicle Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error creating vehicle: " + error.message },
      { status: 500 }
    );
  }
}
