import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, technologies, url, startDate, endDate, role } = body

        // Validation
        if (!name || !description) {
            return NextResponse.json(
                { error: 'Name and description are required' },
                { status: 400 }
            )
        }

        // Create manual project
        const project = await prisma.project.create({
            data: {
                user_id: session.user.id,
                platform: 'manual',
                external_id: `manual_${Date.now()}`, // Unique ID for manual projects
                name,
                description,
                url: url || '',
                technologies_jsonb: technologies || [],
                stars: null,
                forks: null,
                language: technologies?.[0] || null,
                is_selected: false,
            },
        })

        return NextResponse.json({
            success: true,
            project,
        })
    } catch (error) {
        console.error('Error creating manual project:', error)
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        )
    }
}
