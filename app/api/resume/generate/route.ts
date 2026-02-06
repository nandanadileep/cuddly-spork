import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderLatexTemplate, TemplateId } from '@/lib/latex/templates'

const parseLatexLiteError = (raw: string) => {
    let details = String(raw || '').trim()
    try {
        const parsed = JSON.parse(details)
        const maybe = parsed?.error?.message || parsed?.message || details
        details = String(maybe || '').trim()
    } catch {
        // keep raw
    }
    details = details.replace(/\s+/g, ' ').trim()

    let hint = ''
    if (/missing\\s*\\\\item|perhaps a missing\s*\\\\item/i.test(details)) {
        hint = 'Tip: this usually happens when a section has no bullet points. Add a bullet (or remove the empty section) and try again.'
    } else if (/undefined control sequence/i.test(details)) {
        hint = 'Tip: remove backslashes or LaTeX commands from your text and try again.'
    } else if (/runaway argument|file ended while scanning|extra \\}|missing \\}|missing \\{/i.test(details)) {
        hint = 'Tip: remove unmatched braces like { or } from your text and try again.'
    }

    return { details, hint }
}

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
            excludedSkills,
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
        const resolvedExcludedSkills = excludedSkills || draft?.excluded_skills_jsonb || []
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

        const extracurriculars = await prisma.extracurricular.findMany({
            where: { user_id: userRecord.id },
            orderBy: [{ start_date: 'desc' }],
        })

        const awards = await prisma.award.findMany({
            where: { user_id: userRecord.id },
            orderBy: [{ awarded_at: 'desc' }],
        })

        const publications = await prisma.publication.findMany({
            where: { user_id: userRecord.id },
            orderBy: [{ published_at: 'desc' }],
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

        const extractBulletPoints = (value: unknown): string[] => {
            const bullets = (value as any)?.bulletPoints
            if (!Array.isArray(bullets)) return []
            return bullets.filter((item) => typeof item === 'string')
        }

        const formattedProjects = [
            ...projects.map(project => ({
                name: project.name,
                description: project.description || '',
                url: project.url,
                technologies: Array.isArray(project.technologies_jsonb) ? project.technologies_jsonb as string[] : [],
                bulletPoints: (() => {
                    const override = (bulletsMap as any)?.[project.id]
                    const fallback = extractBulletPoints(project.ai_analysis_jsonb)
                    const resolved = Array.isArray(override) ? override : fallback
                    return resolved.slice(0, 4)
                })(),
            })),
            ...(manual as any[]).map((project) => ({
                name: project.name,
                description: project.description,
                technologies: Array.isArray(project.technologies) ? project.technologies : [],
                bulletPoints: (project.notes || []).slice(0, 4),
            })),
        ]

        const excludedSet = new Set((resolvedExcludedSkills || []).map((item: string) => item.toLowerCase()))
        const uniqueSkills = Array.from(new Set(allSkills))
            .filter(Boolean)
            .filter((item) => !excludedSet.has(String(item).toLowerCase()))

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
                bulletPoints: (() => {
                    if (!item.description) return []
                    const normalized = item.description.trim()
                    if (normalized.includes('\n\n')) {
                        return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    }
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
            })),
            education: education.map(item => ({
                institution: item.institution,
                degree: `${[item.degree, item.field].filter(Boolean).join(', ')}${item.cgpa ? ` | CGPA: ${item.cgpa}` : ''}`,
                location: item.location || '',
                dateRange: formatDateRange(item.start_date, item.end_date, item.is_current),
                bulletPoints: (() => {
                    if (!item.description) return []
                    const normalized = item.description.trim()
                    if (normalized.includes('\n\n')) {
                        return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    }
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
            })),
            extracurriculars: extracurriculars.map(item => ({
                title: item.title,
                organization: item.organization || '',
                location: item.location || '',
                dateRange: formatDateRange(item.start_date, item.end_date, item.is_current),
                bulletPoints: (() => {
                    if (!item.description) return []
                    const normalized = item.description.trim()
                    if (normalized.includes('\n\n')) {
                        return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    }
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
            })),
            awards: awards.map(item => ({
                title: item.title,
                issuer: item.issuer || '',
                date: formatDate(item.awarded_at),
                bulletPoints: (() => {
                    if (!item.description) return []
                    const normalized = item.description.trim()
                    if (normalized.includes('\n\n')) {
                        return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    }
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
            })),
            publications: publications.map(item => ({
                title: item.title,
                venue: item.venue || '',
                date: formatDate(item.published_at),
                url: item.url || null,
                bulletPoints: (() => {
                    if (!item.description) return []
                    const normalized = item.description.trim()
                    if (normalized.includes('\n\n')) {
                        return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    }
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
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
            const { details, hint } = parseLatexLiteError(errorText)
            return NextResponse.json({ error: 'LaTeX compilation failed', details, hint }, { status: 502 })
        }

        const pdfBuffer = Buffer.from(await latexResponse.arrayBuffer())

        return NextResponse.json({
            success: true,
            latexContent: latexPayload.template,
            pdfBase64: pdfBuffer.toString('base64'),
        })
    } catch (error) {
        console.error('[Resume Generate] Error:', error)
        return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 })
    }
}
