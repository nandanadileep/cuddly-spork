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
        const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_reset_token: token,
                password_reset_expires: expires,
            },
        })

        // TODO: Send email with reset link, e.g.:
        // https://yourapp.com/reset-password?token=...
        // For now we just store the token. Integrate Nodemailer, Resend, or your email provider.
        console.log('[Forgot password] Reset token for', user.email, '- link: /reset-password?token=' + token)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
