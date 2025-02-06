import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * Checks that the user is authenticated and has the required permissions.
 * @param {string[]} requiredPermissions - An array of permission strings that the user must have.
 * @returns {Promise<{ session: any, admin: any, userPermissions: string[] }>}
 */
export async function requireAdminAuth(requiredPermissions = []) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/')
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    include: { permissions: true }
  })

  if (!admin) {
    redirect('/')
  }

  session.user.name = admin.name;
  session.user.email = admin.email;
  session.user.role = admin.role;

  const userPermissions = admin.permissions.map(permission => permission.name)
  if (session.user.role !== "superadmin" && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    )
    if (!hasAllPermissions) {
      redirect('/unauthorized')
    }
  }

  return { session, admin, userPermissions }
}
