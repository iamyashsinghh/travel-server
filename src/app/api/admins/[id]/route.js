import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const PERMISSIONS = {
  MANAGE_ADMIN: "admin.manage",
  DELETE_ADMIN: "admin.delete",
};

async function hasPermission(session, requiredPermission) {
  if (!session || !session.user) return false;
  // Superadmin has full access
  if (session.user.role === "superadmin") return true;
  // Fetch the admin with permissions
  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    include: { permissions: true },
  });
  if (!admin) return false;
  // Extract permission names
  const userPermissions = admin.permissions.map((perm) => perm.name);
  return userPermissions.includes(requiredPermission);
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!(await hasPermission(session, PERMISSIONS.MANAGE_ADMIN))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const admin = await prisma.admin.findUnique({
      where: { id: id },
      include: { permissions: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("GET Admin Error:", error);
    return NextResponse.json({ error: "Error fetching admin" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  console.log('hit')

  if (!(await hasPermission(session, PERMISSIONS.MANAGE_ADMIN))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const data = await request.json();
    console.log("PUT data received:", data);

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const requiredFields = ['name', 'email', 'role'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    const adminId = parseInt(id, 10);

    const updatedAdmin = await prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: adminId },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
        },
      });

      await tx.permission.deleteMany({
        where: { adminId },
      });

      if (permissions.length > 0) {
        await Promise.all(
          permissions.map((permName) =>
            tx.permission.create({
              data: {
                name: permName,
                adminId,
              },
            })
          )
        );
      }

      return tx.admin.findUnique({
        where: { id: adminId },
        include: { permissions: true },
      });
    });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error("PUT Admin Error Details:", error.message, error.stack);
    return NextResponse.json(
      { error: "Error updating admin: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!(await requireAllAdminAuth(["admin.delete"]))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = parseInt(params.id, 10);
    await prisma.admin.delete({
      where: { id: adminId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Admin Error:", error);
    const errorMessage = error?.message || "Error deleting admin";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

