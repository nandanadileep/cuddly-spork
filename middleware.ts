import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET

    // getToken() defaults secureCookie based on NEXTAUTH_URL, which is often mis-set on Vercel.
    // We try both cookie name variants so auth keeps working even if NEXTAUTH_URL is wrong.
    const token =
        (await getToken({ req: request, secret, secureCookie: true })) ||
        (await getToken({ req: request, secret, secureCookie: false }))

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup')
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/onboarding') ||
        request.nextUrl.pathname.startsWith('/settings')

    // Redirect to dashboard if logged in and trying to access auth pages
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect to login if not logged in and trying to access protected routes
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/onboarding',
        '/settings',
        '/login',
        '/signup',
    ],
}
