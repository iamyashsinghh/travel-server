import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next"; // use this import in App Router
import { authOptions } from "@/lib/auth";

// Define required permissions for each action
const PERMISSIONS = {
  READ_ADMIN: "admin.manage",     // Permission for fetching admin details
  UPDATE_ADMIN: "admin.update",   // Permission for updating admin details
  DELETE_ADMIN: "admin.delete",   // Permission for deleting admin
};

// Helper function to check if a user has the required permission
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

// GET: Fetch an admin by id
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  
  if (!(await hasPermission(session, PERMISSIONS.READ_ADMIN))) {
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

// PUT: Update an admin by id
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  console.log('hit')
  
  if (!(await hasPermission(session, PERMISSIONS.UPDATE_ADMIN))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const data = await request.json();
    console.log("PUT data received:", data);

    // Validate request body
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Check required fields
    const requiredFields = ['name', 'email', 'role'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Ensure permissions is an array
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    // Convert the admin id to an integer (based on your SQL schema)
    const adminId = parseInt(id, 10);

    // Use a transaction to update admin details and replace permissions
    const updatedAdmin = await prisma.$transaction(async (tx) => {
      // Update the admin's basic fields
      await tx.admin.update({
        where: { id: adminId },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
        },
      });

      // Remove all existing permissions for this admin
      await tx.permission.deleteMany({
        where: { adminId },
      });

      // Create new permissions records for each permission name provided
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

      // Return the updated admin along with its permissions
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

// DELETE: Delete an admin by id
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  
  if (!(await hasPermission(session, PERMISSIONS.DELETE_ADMIN))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    await prisma.admin.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Admin Error:", error);
    return NextResponse.json({ error: "Error deleting admin" }, { status: 500 });
  }
}
