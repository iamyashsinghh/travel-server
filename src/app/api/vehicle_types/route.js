import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

// GET all vehicle types
export async function GET(request) {
  if (!(await requireAllAdminAuth(["vehicle_types.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const vehicleTypes = await prisma.vehicle_types.findMany({
      include: { vehicles: true },
    });
    return NextResponse.json(vehicleTypes);
  } catch (error) {
    console.error("GET vehicle types Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching vehicle types: " + error.message },
      { status: 500 }
    );
  }
}


export async function POST(request) {
  if (!(await requireAllAdminAuth(["vehicle_types.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (key !== "icon") {
        data[key] = value;
      }
    }
    if (!data.name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    let iconPath = null;
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
      console.log("POST: Icon uploaded, filePath:", iconPath);
    }

    const vehicleType = await prisma.vehicle_types.create({
      data: {
        name: data.name,
        type: data.type,
        no_of_person: Number(data.no_of_person),
        icon: iconPath,
        status: data.status || "start_riding",
      },
    });

    return NextResponse.json(vehicleType);
  } catch (error) {
    console.error("POST vehicle type Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error creating vehicle type: " + error.message },
      { status: 500 }
    );
  }
}