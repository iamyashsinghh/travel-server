import { requireAdminAuth } from "@/hooks/permission"

export default async function AdminDashboard() {
  const { session, userPermissions } = await requireAdminAuth([])
  return (
    <>
        <h1>Welcome, {session.user.name}</h1>
        <p>Role: {session.user.role}</p>
        <p>Permissions: {userPermissions.join(', ')}</p>
    </>
  )
}
