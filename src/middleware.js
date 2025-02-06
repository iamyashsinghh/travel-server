import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!session && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  if (session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*'],
}
