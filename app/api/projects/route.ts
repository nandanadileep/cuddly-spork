import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

        const projects = await prisma.project.findMany({
            where: { user_id: userRecord.id },
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
                ai_score: true,
                ai_analysis_jsonb: true,
                is_selected: true,
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
