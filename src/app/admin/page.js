import { requireAdminAuth } from "@/hooks/permission"
import MasterLayout from "@/masterLayout/MasterLayout"

export default async function AdminDashboard() {
const { session, userPermissions } = await requireAdminAuth(['dashboard.access'])
  return (
    <>
          <MasterLayout>

        {/* <AlertLayer /> */}

      <h1>Welcome, {session.user.name}</h1>
      <p>Role: {session.user.role}</p>
      <p>Permissions: {userPermissions.join(', ')}</p>
      </MasterLayout>

    </>
  )
}
