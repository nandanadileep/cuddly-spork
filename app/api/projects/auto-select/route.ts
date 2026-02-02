import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { limit = 3 } = await req.json()

        // 1. Deselect all currently selected projects for this user
        await prisma.project.updateMany({
            where: { user_id: session.user.id },
            data: { is_selected: false }
        })

        // 2. Get the top N projects by AI score
        const topProjects = await prisma.project.findMany({
            where: {
                user_id: session.user.id,
                ai_score: { not: null }
            },
            orderBy: { ai_score: 'desc' },
            take: limit,
            select: { id: true }
        })

        if (topProjects.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No analyzed projects found. Please run AI analysis first.'
            }, { status: 400 })
        }

        // 3. Mark them as selected
        const projectIds = topProjects.map(p => p.id)

        await prisma.project.updateMany({
            where: {
                id: { in: projectIds }
            },
            data: { is_selected: true }
        })

        return NextResponse.json({
            success: true,
            selectedCount: projectIds.length,
            projectIds
        })

    } catch (error) {
        console.error('[Project Auto-Select] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
