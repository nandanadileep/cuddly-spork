import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, email_verified_at: true },
        })

        if (!user) {
            // Do not leak whether the email exists
            return NextResponse.json({ success: true, sent: false })
        }

        if (user.email_verified_at) {
            return NextResponse.json({ success: true, sent: false, alreadyVerified: true })
        }

        const token = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                email_verification_token: hashedToken,
                email_verification_expires: expires,
            },
        })

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            'http://localhost:3000'
        const verifyUrl = `${baseUrl}/verify-email?token=${token}`
        const result = await sendEmailVerification({ to: email, verifyUrl })

        return NextResponse.json({ success: true, sent: !result.skipped })
    } catch (error) {
        console.error('[Resend Verification] Error:', error)
        return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 })
    }
}
