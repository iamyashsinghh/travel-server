import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!(await requireAllAdminAuth(["drivers.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drivers = await prisma.drivers.findMany({
      include: { permissions: true },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error("GET drivers Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching drivers: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  if (!(await requireAllAdminAuth(["drivers.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    const requiredFields = ["name", "email", "mobile", "alt_mobile", "age", "gender", "dob", "current_address", "address"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    let profilePicturePath = "";
    const file = formData.get("profile_picture");
    if (file && file.size) {
      const fileName = file.name;
      const extension = fileName.split(".").pop();
      const newFileName = `${Date.now()}.${extension}`;
      const filePath = `uploads/${newFileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(process.cwd(), "public", filePath), buffer);
      profilePicturePath = filePath;
    }
    
    const driver = await prisma.drivers.create({
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        alt_mobile: data.alt_mobile,
        age: parseInt(data.age, 10),
        gender: data.gender,
        dob: data.dob,
        current_address: data.current_address,
        address: data.address,
        profile_image: profilePicturePath || data.profile_image,
        created_by: session.user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    
    return NextResponse.json(driver);
  } catch (error) {
    console.error("POST driver Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error creating driver: " + error.message },
      { status: 500 }
    );
  }
}
