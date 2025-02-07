import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Checks user authentication and permissions using a specified strategy.
 * 
 * @param {Object|string[]} params - Can be an array of permissions or an options object.
 * @param {string[]} [params.requiredPermissions=[]] - Permissions the user must have.
 * @param {'all'|'any'} [params.strategy='all'] - Strategy to check permissions ('all' or 'any').
 * @returns {Promise<{ session: any, admin: any, userPermissions: string[] }>}
 */
export async function requireAdminAuth(params = []) {
  try {
    // Extract parameters
    let requiredPermissions, strategy;
    if (Array.isArray(params)) {
      // Backward compatibility: params is the permissions array
      requiredPermissions = params;
      strategy = 'all';
    } else {
      // New usage: params is an object with requiredPermissions and strategy
      requiredPermissions = params.requiredPermissions || [];
      strategy = params.strategy || 'all';
    }

    // Get session and validate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("User session not found");
      redirect("/");
    }

    // Fetch admin from DB
    const admin = await prisma.admin.findUnique({
      where: { [session.user.id ? 'id' : 'email']: session.user.id || session.user.email },
      include: { permissions: true },
    });

    if (!admin) {
      console.error("Admin not found for user:", session.user);
      redirect("/");
    }

    // Update session with latest admin data
    session.user = { ...session.user, ...admin };

    // Extract user permissions
    const userPermissions = admin.permissions.map(p => p.name);

    // Check permissions if needed
    if (admin.role !== "superadmin" && requiredPermissions.length > 0) {
      let hasRequired;
      switch (strategy) {
        case 'any':
          hasRequired = requiredPermissions.some(perm => userPermissions.includes(perm));
          break;
        case 'all':
        default:
          hasRequired = requiredPermissions.every(perm => userPermissions.includes(perm));
      }

      if (!hasRequired) {
        console.error(`User lacks required permissions (strategy: ${strategy}):`, requiredPermissions);
        redirect("/access-denied");
      }
    }

    return { session, admin, userPermissions };
  } catch (error) {
    console.error("Error in requireAdminAuth:", error);
    redirect("/");
  }
}

// Helper functions for common use cases
export const requireAllAdminAuth = (requiredPermissions) => 
  requireAdminAuth({ requiredPermissions, strategy: 'all' });

export const requireAnyAdminAuth = (requiredPermissions) => 
  requireAdminAuth({ requiredPermissions, strategy: 'any' });