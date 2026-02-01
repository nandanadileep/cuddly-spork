import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// POST - AI auto-selects best projects based on score
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { minScore = 50, maxProjects = 6 } = body

        // First, deselect all projects
        await prisma.project.updateMany({
            where: {
                user_id: session.user.id,
            },
            data: {
                is_selected: false,
            },
        })

        // Get top projects by AI score
        const topProjects = await prisma.project.findMany({
            where: {
                user_id: session.user.id,
                ai_score: { gte: minScore },
            },
            orderBy: { ai_score: 'desc' },
            take: maxProjects,
            select: { id: true, name: true, ai_score: true },
        })

        if (topProjects.length === 0) {
            // If no projects meet the threshold, select top 3 regardless of score
            const anyProjects = await prisma.project.findMany({
                where: {
                    user_id: session.user.id,
                    ai_score: { not: null },
                },
                orderBy: { ai_score: 'desc' },
                take: 3,
                select: { id: true, name: true, ai_score: true },
            })

            if (anyProjects.length > 0) {
                await prisma.project.updateMany({
                    where: {
                        id: { in: anyProjects.map(p => p.id) },
                    },
                    data: {
                        is_selected: true,
                    },
                })

                return NextResponse.json({
                    success: true,
                    message: `AI selected ${anyProjects.length} projects (top scored available)`,
                    selectedProjects: anyProjects,
                })
            }

            return NextResponse.json({
                success: false,
                message: 'No analyzed projects found. Please analyze projects first.',
            })
        }

        // Select the top projects
        await prisma.project.updateMany({
            where: {
                id: { in: topProjects.map(p => p.id) },
            },
            data: {
                is_selected: true,
            },
        })

        return NextResponse.json({
            success: true,
            message: `AI selected ${topProjects.length} projects with score >= ${minScore}`,
            selectedProjects: topProjects,
        })
    } catch (error) {
        console.error('Error auto-selecting projects:', error)
        return NextResponse.json(
            { error: 'Failed to auto-select projects' },
            { status: 500 }
        )
    }
}
