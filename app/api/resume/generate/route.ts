import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderLatexTemplate, TemplateId } from '@/lib/latex/templates'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            templateId,
            selectedProjectIds,
            manualProjects,
            skills,
            manualSkills,
            projectBullets,
        } = body || {}

        const draft = await prisma.analysisDraft.findUnique({
            where: { user_id: session.user.id },
        })

        const selectedIds = selectedProjectIds || draft?.selected_project_ids_jsonb || []
        const manual = manualProjects || draft?.manual_projects_jsonb || []
        const allSkills = [
            ...(skills || draft?.skills_jsonb || []),
            ...(manualSkills || draft?.manual_skills_jsonb || []),
        ]
        const bulletsMap = projectBullets || draft?.project_bullets_jsonb || {}

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, target_role: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const projects = await prisma.project.findMany({
            where: { id: { in: selectedIds as string[] }, user_id: session.user.id },
        })

        const formattedProjects = [
            ...projects.map(project => ({
                name: project.name,
                description: project.description || 'No description',
                bulletPoints: (bulletsMap[project.id] || project.ai_analysis_jsonb?.bulletPoints || []).slice(0, 4),
            })),
            ...(manual as any[]).map((project) => ({
                name: project.name,
                description: project.description,
                bulletPoints: (project.notes || []).slice(0, 4),
            })),
        ]

        const uniqueSkills = Array.from(new Set(allSkills)).filter(Boolean)

        const payload = {
            name: user.name || 'Untitled Resume',
            email: user.email,
            targetRole: user.target_role,
            projects: formattedProjects,
            skills: uniqueSkills,
        }

        const resolvedTemplateId = (templateId || draft?.template_id || 'modern') as TemplateId
        const latexPayload = renderLatexTemplate(resolvedTemplateId, payload)

        const apiKey = process.env.LATEXLITE_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'LATEXLITE_API_KEY is not configured' }, { status: 500 })
        }

        const latexResponse = await fetch('https://latexlite.com/v1/renders-sync', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                template: latexPayload.template,
                data: latexPayload.data,
            }),
        })

        if (!latexResponse.ok) {
            const errorText = await latexResponse.text()
            console.error('[Resume Generate] LaTeXLite error:', errorText)
            return NextResponse.json({ error: 'LaTeX compilation failed' }, { status: 502 })
        }

        const pdfBuffer = Buffer.from(await latexResponse.arrayBuffer())

        const resume = await prisma.resume.create({
            data: {
                user_id: session.user.id,
                title: `Resume Draft - ${new Date().toISOString().slice(0, 10)}`,
                target_role: user.target_role || null,
                template_id: resolvedTemplateId,
                latex_content: latexContent,
                pdf_url: null,
                selected_projects_jsonb: selectedIds,
                skills_jsonb: uniqueSkills,
            },
            select: { id: true },
        })

        return NextResponse.json({
            success: true,
            resumeId: resume.id,
            latexContent: latexPayload.template,
            pdfBase64: pdfBuffer.toString('base64'),
        })
    } catch (error) {
        console.error('[Resume Generate] Error:', error)
        return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 })
    }
}
