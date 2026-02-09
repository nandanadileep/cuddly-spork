import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { firstName, middleName, lastName, email, linkedinUrl, websiteUrl, phone, location } = await req.json()

        // Validation (basic)
        if (linkedinUrl && !linkedinUrl.includes('linkedin.com/in/')) {
            return NextResponse.json(
                { error: 'Invalid LinkedIn URL. Must contain linkedin.com/in/' },
                { status: 400 }
            )
        }

        const normalizeUrlOrNull = (value: unknown) => {
            if (typeof value !== 'string') return undefined
            const trimmed = value.trim()
            if (!trimmed) return null
            try {
                const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
                    ? trimmed
                    : `https://${trimmed}`
                return new URL(normalized).toString()
            } catch {
                return undefined
            }
        }

        const nextWebsite = normalizeUrlOrNull(websiteUrl)
        if (websiteUrl && nextWebsite === undefined) {
            return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 })
        }

        // Email validation + uniqueness
        let nextEmail: string | undefined
        if (typeof email === 'string') {
            const trimmed = email.trim().toLowerCase()
            if (!trimmed) {
                return NextResponse.json({ error: 'Email is required' }, { status: 400 })
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(trimmed)) {
                return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
            }

            const existingEmail = await prisma.user.findFirst({
                where: {
                    email: { equals: trimmed, mode: 'insensitive' },
                    NOT: { id: session.user.id },
                },
                select: { id: true },
            })

            if (existingEmail) {
                return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
            }

            nextEmail = trimmed
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true },
        })
        const isEmailChange = nextEmail && currentUser?.email?.toLowerCase() !== nextEmail
        const verificationToken = isEmailChange ? crypto.randomBytes(32).toString('hex') : null
        const hashedToken = verificationToken
            ? crypto.createHash('sha256').update(verificationToken).digest('hex')
            : null
        const verificationExpires = verificationToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null

        // Update user
        const nameParts = [firstName, middleName, lastName]
            .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
        const fullName = nameParts.join(' ')

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(nextEmail ? { email: nextEmail } : {}),
                ...(fullName ? { name: fullName } : {}),
                linkedin_url: linkedinUrl || null,
                website: nextWebsite,
                phone: typeof phone === 'string' ? phone.trim() || null : undefined,
                location: typeof location === 'string' ? location.trim() || null : undefined,
                ...(isEmailChange
                    ? {
                          email_verified_at: null,
                          email_verification_token: hashedToken,
                          email_verification_expires: verificationExpires,
                      }
                    : {}),
            },
        })

        if (isEmailChange && verificationToken) {
            const baseUrl =
                process.env.NEXT_PUBLIC_APP_URL ||
                process.env.NEXTAUTH_URL ||
                'http://localhost:3000'
            const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`
            await sendEmailVerification({ to: nextEmail!, verifyUrl })
        }

        return NextResponse.json({
            success: true,
            user: {
                linkedinUrl: user.linkedin_url,
                websiteUrl: user.website,
                phone: user.phone,
                location: user.location,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                linkedin_url: true,
                website: true,
                phone: true,
                location: true,
                name: true,
                email: true,
                onboarding_completed: true
            }
        })

        return NextResponse.json({
            user: {
                linkedinUrl: user?.linkedin_url,
                websiteUrl: user?.website,
                phone: user?.phone,
                location: user?.location,
                name: user?.name,
                email: user?.email,
                onboardingCompleted: user?.onboarding_completed
            }
        })
    } catch (error) {
        console.error('Profile fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
