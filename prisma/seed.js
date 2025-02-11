const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.admin.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Super Admin",
      role: "superadmin",
      permissions: {
        create: [
          { name: "admin.manage" },
        ]
      }
    }
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
