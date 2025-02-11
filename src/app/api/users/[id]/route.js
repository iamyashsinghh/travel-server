import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAllAdminAuth } from "@/lib/permissions";
import fs from "fs";
import path from "path";

export async function GET(request, { params }) {  
  if (!(await requireAllAdminAuth(["users.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const user = await prisma.users.findUnique({
      where: { id: Number(id) },
      include: { permissions: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user Error:", error);
    return NextResponse.json({ error: "Error fetching user" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!(await requireAllAdminAuth(["users.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    console.log("PUT data received:", data);

    const requiredFields = ["name", "email"];
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
      const filePath = path.join("uploads", newFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(process.cwd(), "public", filePath), buffer);
      profilePicturePath = filePath;
    }

    const userId = Number(id);
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        username: data.username,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        gender: data.gender,
        active: data.active === "true" || data.active === true,
        email_confirmed: data.email_confirmed === "true" || data.email_confirmed === true,
        mobile_confirmed: data.mobile_confirmed === "true" || data.mobile_confirmed === true,
        profile_picture: profilePicturePath || data.profile_picture,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("PUT user Error Details:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error updating user: " + error.message },
      { status: 500 }
    );
  }
}


    export async function DELETE(request, { params }) {
      try {
        if (!(await requireAllAdminAuth(["users.delete"]))) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
         const user = parseInt(params.id, 10);
                await prisma.users.delete({
          where: { id: user },
        });
        
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("DELETE user Error:", error);
        
        const errorMessage = error?.message || "Error deleting user";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
    }