import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const url = req.nextUrl
  const authCookie = req.cookies.get('studio_auth')?.value

  if (url.pathname === '/studio/login') {
    return NextResponse.next()
  }

  if (authCookie !== process.env.STUDIO_PASSWORD) {
    return NextResponse.redirect(new URL('/studio/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/studio/:path*'],
}
