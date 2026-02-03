import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderLatexTemplate, TemplateId } from '@/lib/latex/templates'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
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

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    target_role: true,
                    phone: true,
                    location: true,
                    website: true,
                    linkedin_url: true,
                }
            })
            : userEmail
                ? await prisma.user.findUnique({
                    where: { email: userEmail },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        target_role: true,
                        phone: true,
                        location: true,
                        website: true,
                        linkedin_url: true,
                    }
                })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const draft = await prisma.analysisDraft.findUnique({
            where: { user_id: userRecord.id },
        })

        const selectedIds = selectedProjectIds || draft?.selected_project_ids_jsonb || []
        const manual = manualProjects || draft?.manual_projects_jsonb || []
        const allSkills = [
            ...(skills || draft?.skills_jsonb || []),
            ...(manualSkills || draft?.manual_skills_jsonb || []),
        ]
        const bulletsMap = projectBullets || draft?.project_bullets_jsonb || {}

        const user = userRecord

        const projects = await prisma.project.findMany({
            where: { id: { in: selectedIds as string[] }, user_id: userRecord.id },
        })

        const connections = await prisma.platformConnection.findMany({
            where: { user_id: userRecord.id },
            select: { platform: true, username: true, metadata_jsonb: true }
        })

        const githubConnection = connections.find(item => item.platform === 'github')
        const githubUrl = githubConnection?.username
            ? `https://github.com/${githubConnection.username}`
            : (githubConnection?.metadata_jsonb as any)?.manual_url || null

        const workExperience = await prisma.workExperience.findMany({
            where: { user_id: userRecord.id },
            orderBy: [{ start_date: 'desc' }],
        })

        const education = await prisma.education.findMany({
            where: { user_id: userRecord.id },
            orderBy: [{ start_date: 'desc' }],
        })

        const formatDate = (value?: Date | null) => {
            if (!value) return ''
            return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(value)
        }

        const formatDateRange = (start?: Date | null, end?: Date | null, isCurrent?: boolean | null) => {
            const startText = formatDate(start)
            const endText = isCurrent ? 'Present' : formatDate(end)
            if (startText && endText) return `${startText} - ${endText}`
            return startText || endText || ''
        }

        const formattedProjects = [
            ...projects.map(project => ({
                name: project.name,
                description: project.description || '',
                url: project.url,
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
            phone: (user as any).phone || null,
            location: (user as any).location || null,
            website: (user as any).website || null,
            linkedin: (user as any).linkedin_url || null,
            github: githubUrl,
            targetRole: user.target_role,
            projects: formattedProjects,
            skills: uniqueSkills,
            workExperience: workExperience.map(item => ({
                company: item.company,
                position: item.position,
                dateRange: formatDateRange(item.start_date, item.end_date, item.is_current),
                location: item.location || '',
                bulletPoints: item.description
                    ? item.description.split('\n').map(line => line.trim()).filter(Boolean)
                    : [],
            })),
            education: education.map(item => ({
                institution: item.institution,
                degree: [item.degree, item.field].filter(Boolean).join(', '),
                dateRange: formatDateRange(item.start_date, item.end_date, item.is_current),
                bulletPoints: item.description
                    ? item.description.split('\n').map(line => line.trim()).filter(Boolean)
                    : [],
            })),
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
                user_id: userRecord.id,
                title: `Resume Draft - ${new Date().toISOString().slice(0, 10)}`,
                target_role: user.target_role || null,
                template_id: resolvedTemplateId,
                latex_content: latexPayload.template,
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
