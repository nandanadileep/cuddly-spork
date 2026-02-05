import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const RESUME_LIMIT = 2

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
            : userEmail
                ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const count = await prisma.resume.count({ where: { user_id: userRecord.id } })
        return NextResponse.json({
            count,
            limit: RESUME_LIMIT,
            remaining: Math.max(0, RESUME_LIMIT - count),
        })
    } catch (error) {
        console.error('[Resume Quota] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch quota' }, { status: 500 })
    }
}
