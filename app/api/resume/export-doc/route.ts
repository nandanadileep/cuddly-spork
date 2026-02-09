import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildDocxResume } from '@/lib/docx-resume'
import type { ResumePayload } from '@/lib/latex/templates'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, target_role: true, phone: true, location: true, website: true, linkedin_url: true } })
            : userEmail
                ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true, email: true, target_role: true, phone: true, location: true, website: true, linkedin_url: true } })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await req.json().catch(() => ({}))
        const {
            selectedProjectIds,
            manualProjects,
            skills,
            manualSkills,
            excludedSkills,
            projectBullets,
        } = body || {}

        const draft = await prisma.analysisDraft.findUnique({ where: { user_id: userRecord.id } })
        const selectedIds = selectedProjectIds ?? draft?.selected_project_ids_jsonb ?? []
        const manual = manualProjects ?? draft?.manual_projects_jsonb ?? []
        const resolvedExcludedSkills = excludedSkills ?? draft?.excluded_skills_jsonb ?? []
        const allSkills = [
            ...(skills ?? draft?.skills_jsonb ?? []),
            ...(manualSkills ?? draft?.manual_skills_jsonb ?? []),
        ]
        const bulletsMap = projectBullets ?? draft?.project_bullets_jsonb ?? {}

        const projects = await prisma.project.findMany({
            where: { id: { in: selectedIds as string[] }, user_id: userRecord.id },
        })
        const connections = await prisma.platformConnection.findMany({
            where: { user_id: userRecord.id },
            select: { platform: true, username: true, metadata_jsonb: true },
        })
        const githubConnection = connections.find(item => item.platform === 'github')
        const githubUrl = githubConnection?.username
            ? `https://github.com/${githubConnection.username}`
            : (githubConnection?.metadata_jsonb as { manual_url?: string })?.manual_url ?? null

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

        const formatDate = (value?: Date | null) =>
            value ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(value) : ''
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
                technologies: Array.isArray(project.technologies_jsonb) ? (project.technologies_jsonb as string[]) : [],
                bulletPoints: (bulletsMap[project.id] || (project.ai_analysis_jsonb as { bulletPoints?: string[] })?.bulletPoints || []).slice(0, 4),
            })),
            ...(manual as Array<{ name: string; description: string; technologies?: string[]; notes?: string[] }>).map(project => ({
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

        const payload: ResumePayload = {
            name: userRecord.name || 'Untitled Resume',
            email: userRecord.email,
            phone: userRecord.phone ?? null,
            location: userRecord.location ?? null,
            website: userRecord.website ?? null,
            linkedin: userRecord.linkedin_url ?? null,
            github: githubUrl,
            targetRole: userRecord.target_role ?? null,
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
                    if (normalized.includes('\n\n')) return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
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
                    if (normalized.includes('\n\n')) return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
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
                    if (normalized.includes('\n\n')) return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
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
                    if (normalized.includes('\n\n')) return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
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
                    if (normalized.includes('\n\n')) return normalized.split(/\n\s*\n/).map(line => line.trim()).filter(Boolean)
                    return [normalized.replace(/\s*\n\s*/g, ' ')]
                })(),
            })),
        }

        const buffer = await buildDocxResume(payload)
        const uint8 = new Uint8Array(buffer)
        const filename = `resume-${new Date().toISOString().slice(0, 10)}.docx`
        return new NextResponse(uint8, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error('[Resume Export DOC] Error:', error)
        return NextResponse.json({ error: 'Failed to export resume as DOC' }, { status: 500 })
    }
}
