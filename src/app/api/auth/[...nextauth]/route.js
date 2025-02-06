import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const user = await prisma.admin.findUnique({
            where: { email: credentials.email }
          })
      
          if (!user) {
            console.log(`User with email ${credentials.email} not found.`)
            return null
          }
      
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            console.log(`Invalid password for email ${credentials.email}.`)
            return null
          }
      
          console.log(`User ${credentials.email} authenticated successfully.`)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("Error in authorize callback:", error)
          return null
        }
      }      
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    encryption: true
  }
}
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
