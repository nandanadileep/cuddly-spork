import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
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

        const deleted = await prisma.resume.deleteMany({ where: { user_id: userRecord.id } })
        return NextResponse.json({ success: true, deleted: deleted.count })
    } catch (error) {
        console.error('[Resume History] Error:', error)
        return NextResponse.json({ error: 'Failed to clear resume history' }, { status: 500 })
    }
}

