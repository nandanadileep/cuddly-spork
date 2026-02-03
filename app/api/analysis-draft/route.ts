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
                    projectBullets: draft.project_bullets_jsonb || {},
                    skills: draft.skills_jsonb || [],
                    manualSkills: draft.manual_skills_jsonb || [],
                    excludedSkills: draft.excluded_skills_jsonb || [],
                    templateId: draft.template_id || 'modern',
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
        const existingDraft = await prisma.analysisDraft.findUnique({
            where: { user_id: session.user.id },
        })

        const selectedProjectIds =
            body && 'selectedProjectIds' in body ? body.selectedProjectIds : (existingDraft?.selected_project_ids_jsonb || [])
        const manualProjects =
            body && 'manualProjects' in body ? body.manualProjects : (existingDraft?.manual_projects_jsonb || [])
        const projectBullets =
            body && 'projectBullets' in body ? body.projectBullets : (existingDraft?.project_bullets_jsonb || {})
        const skills =
            body && 'skills' in body ? body.skills : (existingDraft?.skills_jsonb || [])
        const manualSkills =
            body && 'manualSkills' in body ? body.manualSkills : (existingDraft?.manual_skills_jsonb || [])
        const excludedSkills =
            body && 'excludedSkills' in body ? body.excludedSkills : (existingDraft?.excluded_skills_jsonb || [])
        const templateId =
            body && 'templateId' in body ? body.templateId : (existingDraft?.template_id || 'modern')

        const draft = await prisma.analysisDraft.upsert({
            where: { user_id: session.user.id },
            create: {
                user_id: session.user.id,
                selected_project_ids_jsonb: selectedProjectIds,
                manual_projects_jsonb: manualProjects,
                project_bullets_jsonb: projectBullets,
                skills_jsonb: skills,
                manual_skills_jsonb: manualSkills,
                excluded_skills_jsonb: excludedSkills,
                template_id: templateId,
            },
            update: {
                selected_project_ids_jsonb: selectedProjectIds,
                manual_projects_jsonb: manualProjects,
                project_bullets_jsonb: projectBullets,
                skills_jsonb: skills,
                manual_skills_jsonb: manualSkills,
                excluded_skills_jsonb: excludedSkills,
                template_id: templateId,
            },
        })

        return NextResponse.json({
            success: true,
            draft: {
                selectedProjectIds: draft.selected_project_ids_jsonb || [],
                manualProjects: draft.manual_projects_jsonb || [],
                projectBullets: draft.project_bullets_jsonb || {},
                skills: draft.skills_jsonb || [],
                manualSkills: draft.manual_skills_jsonb || [],
                excludedSkills: draft.excluded_skills_jsonb || [],
                templateId: draft.template_id || 'modern',
            },
        })
    } catch (error) {
        console.error('[Analysis Draft] PUT error:', error)
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }
}
