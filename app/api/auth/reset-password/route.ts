import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/utils'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json()
        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

        const user = await prisma.user.findFirst({
            where: {
                password_reset_token: hashedToken,
                password_reset_expires: { gt: new Date() },
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 })
        }

        const password_hash = await hashPassword(password)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash,
                password_reset_token: null,
                password_reset_expires: null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
