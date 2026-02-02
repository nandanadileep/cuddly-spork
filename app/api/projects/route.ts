import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const projects = await prisma.project.findMany({
            where: { user_id: session.user.id },
            select: {
                id: true,
                name: true,
                description: true,
                url: true,
                platform: true,
                stars: true,
                forks: true,
                language: true,
                technologies_jsonb: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: [
                { stars: 'desc' },
                { updated_at: 'desc' }
            ]
        })

        return NextResponse.json({ projects })
    } catch (error) {
        console.error('Fetch projects error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}
