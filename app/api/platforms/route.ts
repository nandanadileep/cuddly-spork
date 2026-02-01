import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const connections = await prisma.platformConnection.findMany({
            where: {
                user_id: session.user.id,
            },
            select: {
                id: true,
                platform: true,
                username: true,
                last_synced: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        })

        return NextResponse.json({ connections })
    } catch (error) {
        console.error('Error fetching platforms:', error)
        return NextResponse.json(
            { error: 'Failed to fetch platforms' },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const platform = searchParams.get('platform')

        if (!platform) {
            return NextResponse.json(
                { error: 'Platform parameter required' },
                { status: 400 }
            )
        }

        await prisma.platformConnection.delete({
            where: {
                user_id_platform: {
                    user_id: session.user.id,
                    platform,
                },
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Platform disconnected',
        })
    } catch (error) {
        console.error('Error disconnecting platform:', error)
        return NextResponse.json(
            { error: 'Failed to disconnect platform' },
            { status: 500 }
        )
    }
}
