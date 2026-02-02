import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const connections = await prisma.platformConnection.findMany({
            where: { user_id: session.user.id },
            select: {
                id: true,
                platform: true,
                username: true,
                last_synced: true,
                metadata_jsonb: true,
            },
        })

        return NextResponse.json({ connections })
    } catch (error) {
        console.error('Fetch connections error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch connections' },
            { status: 500 }
        )
    }
}
