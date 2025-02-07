// app/api/admins/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAllAdminAuth } from "@/lib/permissions";
import bcrypt from "bcrypt"; 

export async function GET() {
  const session = await getServerSession(authOptions);

  // Check if the user has permission to read admins
  if (!(await requireAllAdminAuth(["admin.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admins = await prisma.admin.findMany({
      include: { permissions: true },
    });
    return NextResponse.json(admins);
  } catch (error) {
    console.error("GET Admins Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error fetching admins: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  // Check if the user has permission to create admins
  if (!(await requireAllAdminAuth(["admin.manage"]))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    console.log("POST data received:", data);

    // Validate the request body
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Check required fields (add "password" if your model requires it)
    const requiredFields = ["name", "email", "role", "password"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Ensure permissions is an array (of permission names)
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Create new admin and create new permission records (nested write)
    const admin = await prisma.admin.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        password: hashedPassword,
        permissions: {
          create: permissions.map((permName) => ({
            name: permName,
          })),
        },
      },
      include: { permissions: true },
    });

    return NextResponse.json(admin);
  } catch (error) {
    console.error("POST Admin Error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error creating admin: " + error.message },
      { status: 500 }
    );
  }
}
