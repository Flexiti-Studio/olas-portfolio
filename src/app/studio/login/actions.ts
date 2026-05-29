'use server'

import { cookies } from 'next/headers'

export async function loginAction(password: string) {
  if (password === process.env.STUDIO_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set('studio_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/studio',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })
    return true
  }
  return false
}
