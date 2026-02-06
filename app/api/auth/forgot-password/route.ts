import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        })

        // Always return success so we don't leak whether the email exists
        if (!user) {
            return NextResponse.json({ success: true })
        }

        const token = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_reset_token: hashedToken,
                password_reset_expires: expires,
            },
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetUrl = `${baseUrl}/reset-password?token=${token}`

        // TODO: Send email with reset link via provider (Resend/Nodemailer/etc.)
        console.log('[Forgot password] Reset link for', user.email, resetUrl)

        return NextResponse.json({ success: true, ...(process.env.NODE_ENV === 'development' ? { resetUrl } : {}) })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json(
            {
                error: 'Something went wrong',
                ...(process.env.NODE_ENV === 'development'
                    ? { details: error instanceof Error ? error.message : String(error) }
                    : {}),
            },
            { status: 500 }
        )
    }
}
