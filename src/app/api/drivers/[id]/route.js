import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs/promises";
import path from "path";

export async function GET(_, context) {
  if (!(await requireAllAdminAuth(["drivers.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = context.params;
    const driver = await prisma.drivers.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error("GET driver Error:", error);
    return NextResponse.json({ error: "Error fetching driver" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  if (!(await requireAllAdminAuth(["drivers.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = context.params;
    const formData = await request.formData();
    const data = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const requiredFields = ["name", "email", "mobile", "age"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    let profilePicturePath = data.profile_picture || "";
    const file = formData.get("profile_picture");

    if (file && file.size) {
      const originalName = file.name;
      const extension = originalName.split(".").pop();
      const newFileName = `${Date.now()}.${extension || "jpg"}`;
      const filePath = path.join("public/uploads", newFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      profilePicturePath = `uploads/${newFileName}`;
    }

    const updatedDriver = await prisma.drivers.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        alt_mobile: data.alt_mobile || "",
        age: parseInt(data.age, 10),
        gender: data.gender || "",
        dob: data.dob || "",
        current_address: data.current_address || "",
        address: data.address || "",
        active: data.active === "true" || data.active === true,
        ...(profilePicturePath && { profile_picture: profilePicturePath }),
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error("PUT driver Error:", error.message);
    return NextResponse.json({ error: "Error updating driver: " + error.message }, { status: 500 });
  }
}

export async function DELETE(_, context) {
  if (!(await requireAllAdminAuth(["drivers.delete"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = context.params;
    const driver = await prisma.drivers.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (driver.profile_picture) {
      const filePath = path.join("public", driver.profile_picture);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn("Error deleting image:", err.message);
      }
    }

    await prisma.drivers.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("DELETE driver Error:", error.message);
    return NextResponse.json({ error: "Error deleting driver: " + error.message }, { status: 500 });
  }
}
