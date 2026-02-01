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

        const { searchParams } = new URL(req.url)
        const platform = searchParams.get('platform')
        const sortBy = searchParams.get('sortBy') || 'ai_score'
        const order = searchParams.get('order') || 'desc'

        const where: any = {
            user_id: session.user.id,
        }

        if (platform) {
            where.platform = platform
        }

        const projects = await prisma.project.findMany({
            where,
            orderBy: {
                [sortBy]: order,
            },
        })

        return NextResponse.json({ projects })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId, is_selected } = await req.json()

        const project = await prisma.project.update({
            where: {
                id: projectId,
                user_id: session.user.id,
            },
            data: {
                is_selected,
            },
        })

        return NextResponse.json({ project })
    } catch (error) {
        console.error('Error updating project:', error)
        return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
        )
    }
}
