// src/hooks/permission.js
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Checks that the user is authenticated and has the required permissions.
 * @param {string[]} requiredPermissions - An array of permission strings that the user must have.
 * @returns {Promise<{ session: any, admin: any, userPermissions: string[] }> }
 */
export async function requireAdminAuth(requiredPermissions = []) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("User session not found");
      redirect("/");
    }

    let admin;
    if (session.user.id) {
      admin = await prisma.admin.findUnique({
        where: { id: session.user.id },
        include: { permissions: true },
      });
    } else if (session.user.email) {
      admin = await prisma.admin.findUnique({
        where: { email: session.user.email },
        include: { permissions: true },
      });
    }

    if (!admin) {
      console.error("Admin not found for user:", session.user);
      redirect("/");
    }

    // Update session data with admin details
    session.user.name = admin.name;
    session.user.email = admin.email;
    session.user.role = admin.role;

    // Extract permissions from the admin object
    const userPermissions = admin.permissions.map((permission) => permission.name);

    // If the user is not a superadmin, check that all required permissions are present
    if (session.user.role !== "superadmin" && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );
      if (!hasAllPermissions) {
        console.error("User lacks required permissions:", requiredPermissions);
        redirect("/access-denied");
      }
    }

    return { session, admin, userPermissions };
  } catch (error) {
    console.error("Error in requireAdminAuth:", error);
    redirect("/");
  }
}
