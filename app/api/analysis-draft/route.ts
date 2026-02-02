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

        const draft = await prisma.analysisDraft.findUnique({
            where: { user_id: session.user.id },
        })

        return NextResponse.json({
            success: true,
            draft: draft
                ? {
                    selectedProjectIds: draft.selected_project_ids_jsonb || [],
                    manualProjects: draft.manual_projects_jsonb || [],
                    skills: draft.skills_jsonb || [],
                    manualSkills: draft.manual_skills_jsonb || [],
                }
                : null,
        })
    } catch (error) {
        console.error('[Analysis Draft] GET error:', error)
        return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            selectedProjectIds = [],
            manualProjects = [],
            skills = [],
            manualSkills = [],
        } = body || {}

        const draft = await prisma.analysisDraft.upsert({
            where: { user_id: session.user.id },
            create: {
                user_id: session.user.id,
                selected_project_ids_jsonb: selectedProjectIds,
                manual_projects_jsonb: manualProjects,
                skills_jsonb: skills,
                manual_skills_jsonb: manualSkills,
            },
            update: {
                selected_project_ids_jsonb: selectedProjectIds,
                manual_projects_jsonb: manualProjects,
                skills_jsonb: skills,
                manual_skills_jsonb: manualSkills,
            },
        })

        return NextResponse.json({
            success: true,
            draft: {
                selectedProjectIds: draft.selected_project_ids_jsonb || [],
                manualProjects: draft.manual_projects_jsonb || [],
                skills: draft.skills_jsonb || [],
                manualSkills: draft.manual_skills_jsonb || [],
            },
        })
    } catch (error) {
        console.error('[Analysis Draft] PUT error:', error)
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }
}
