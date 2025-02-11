import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!(await requireAllAdminAuth(["users.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.users.findMany({
      include: { permissions: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET users Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching users: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!(await requireAllAdminAuth(["users.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    const requiredFields = ["name", "email", "mobile"];
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
      fs.writeFileSync(
        path.join(process.cwd(), "public", filePath),
        buffer
      );
      profilePicturePath = filePath;
    }
    const user = await prisma.users.create({
      data: {
        username: data.username,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        gender: data.gender,
        active: data.active === "true" || data.active === true,
        ride_otp: Math.floor(1000 + Math.random() * 9000),
        email_confirmed: data.email_confirmed === "true" || data.email_confirmed === true,
        mobile_confirmed: data.mobile_confirmed === "true" || data.mobile_confirmed === true,
        refferal_code: data.refferal_code,
        profile_picture: profilePicturePath || data.profile_picture,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("POST user Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error creating user: " + error.message },
      { status: 500 }
    );
  }
}

