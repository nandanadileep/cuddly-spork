import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/utils'
import { sendEmailVerification } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json()

        // Validate input
        if (!name || !email || !password) {
            console.log('Signup failed: Missing email or password');
            return NextResponse.json(
                { error: 'Full name, email, and password are required' },
                { status: 400 }
            )
        }

        const normalizedName = String(name).trim()
        const normalizedEmail = String(email).trim().toLowerCase()
        if (normalizedName.split(/\s+/).length < 2) {
            return NextResponse.json(
                { error: 'Please enter your full name (first and last).' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            console.log('Signup failed: Password too short');
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Check if user already exists (case-insensitive)
        const existingUser = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            )
        }

        // Hash password
        const password_hash = await hashPassword(password)

        // Create user + verification token
        const token = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

        // Create user
        const user = await prisma.user.create({
            data: {
                name: normalizedName,
                email: normalizedEmail,
                password_hash,
                email_verification_token: hashedToken,
                email_verification_expires: expires,
            },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            },
        })

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            'http://localhost:3000'
        const verifyUrl = `${baseUrl}/verify-email?token=${token}`
        const verificationResult = await sendEmailVerification({ to: normalizedEmail, verifyUrl })

        return NextResponse.json({
            success: true,
            user,
            verificationSent: !verificationResult.skipped,
        })
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            {
                error: 'An error occurred during signup',
                ...(process.env.NODE_ENV === 'development'
                    ? { details: error instanceof Error ? error.message : String(error) }
                    : {}),
            },
            { status: 500 }
        )
    }
}
