import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get('token')
        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 })
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        const user = await prisma.user.findFirst({
            where: {
                email_verification_token: hashedToken,
                email_verification_expires: { gt: new Date() },
            },
            select: { id: true },
        })

        if (!user?.id) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                email_verified_at: new Date(),
                email_verification_token: null,
                email_verification_expires: null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Verify Email] Error:', error)
        return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
    }
}
