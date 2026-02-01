import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET - Fetch a specific resume
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resume = await prisma.resume.findFirst({
            where: {
                id,
                user_id: session.user.id,
            },
        })

        if (!resume) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
        }

        // Parse content from latex_content (stored as JSON string)
        let content = {}
        try {
            content = JSON.parse(resume.latex_content)
        } catch {
            content = {}
        }

        return NextResponse.json({
            resume: {
                id: resume.id,
                name: resume.title,
                template: resume.template_id,
                targetRole: resume.target_role,
                content,
                skills: resume.skills_jsonb,
                selectedProjects: resume.selected_projects_jsonb,
                created_at: resume.created_at,
                updated_at: resume.updated_at,
            }
        })
    } catch (error) {
        console.error('Error fetching resume:', error)
        return NextResponse.json(
            { error: 'Failed to fetch resume' },
            { status: 500 }
        )
    }
}

// PATCH - Update resume
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name, content, template, skills } = body

        // Build update data
        const updateData: any = {}
        if (name) updateData.title = name
        if (template) updateData.template_id = template
        if (content) updateData.latex_content = JSON.stringify(content)
        if (skills) updateData.skills_jsonb = skills

        const resume = await prisma.resume.updateMany({
            where: {
                id,
                user_id: session.user.id,
            },
            data: updateData,
        })

        if (resume.count === 0) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating resume:', error)
        return NextResponse.json(
            { error: 'Failed to update resume' },
            { status: 500 }
        )
    }
}

// DELETE - Delete resume
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const result = await prisma.resume.deleteMany({
            where: {
                id,
                user_id: session.user.id,
            },
        })

        if (result.count === 0) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting resume:', error)
        return NextResponse.json(
            { error: 'Failed to delete resume' },
            { status: 500 }
        )
    }
}
