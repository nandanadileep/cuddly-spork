import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractResumeData } from '@/lib/openai'

const MAX_TEXT_CHARS = 20000

const normalizeText = (value: string) =>
    value
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

const normalizeKey = (value: string) =>
    value.toLowerCase().replace(/\s+/g, ' ').trim()

const parseDateValue = (value?: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null

    const isoMatch = trimmed.match(/^(\d{4})(-(\d{2}))?/)
    if (isoMatch) {
        const year = isoMatch[1]
        const month = isoMatch[3] || '01'
        const date = new Date(`${year}-${month}-01`)
        return Number.isNaN(date.getTime()) ? null : date
    }

    const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/)
    if (yearMatch) {
        const date = new Date(`${yearMatch[0]}-01-01`)
        return Number.isNaN(date.getTime()) ? null : date
    }

    return null
}

const extractTextFromFile = async (file: File) => {
    const name = file.name.toLowerCase()
    const type = file.type
    const buffer = Buffer.from(await file.arrayBuffer())

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        return data.text || ''
    }

    if (
        type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        name.endsWith('.docx')
    ) {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        return result.value || ''
    }

    if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
        return file.text()
    }

    throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.')
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await req.formData()
        const fileEntry = formData.get('file')
        if (!fileEntry || typeof (fileEntry as File).arrayBuffer !== 'function') {
            return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 })
        }

        const file = fileEntry as File
        const rawText = await extractTextFromFile(file)
        const normalized = normalizeText(rawText)

        if (!normalized || normalized.length < 200) {
            return NextResponse.json({ error: 'Could not read enough text from this file.' }, { status: 400 })
        }

        const extraction = await extractResumeData(normalized.slice(0, MAX_TEXT_CHARS))

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                phone: true,
                location: true,
                website: true,
                linkedin_url: true,
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const contactUpdates: Record<string, string> = {}
        const contact = extraction.contact || {}
        if (!user.name && contact.name) contactUpdates.name = contact.name
        if (!user.phone && contact.phone) contactUpdates.phone = contact.phone
        if (!user.location && contact.location) contactUpdates.location = contact.location
        if (!user.website && contact.website) contactUpdates.website = contact.website
        if (!user.linkedin_url && contact.linkedin) contactUpdates.linkedin_url = contact.linkedin

        if (Object.keys(contactUpdates).length > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: contactUpdates,
            })
        }

        const existingEducation = await prisma.education.findMany({
            where: { user_id: user.id },
            select: { institution: true, degree: true, field: true },
        })
        const educationKeys = new Set(
            existingEducation.map((item) =>
                normalizeKey(`${item.institution}|${item.degree}|${item.field || ''}`)
            )
        )

        let educationAdded = 0
        for (const item of extraction.education || []) {
            const institution = (item.institution || '').trim()
            const degree = (item.degree || '').trim()
            const field = (item.field || '').trim()
            if (!institution || !degree) continue
            const key = normalizeKey(`${institution}|${degree}|${field}`)
            if (educationKeys.has(key)) continue

            const isCurrent = Boolean(item.isCurrent) || /present|current/i.test(item.endDate || '')
            const startDate = parseDateValue(item.startDate)
            const endDate = isCurrent ? null : parseDateValue(item.endDate)

            await prisma.education.create({
                data: {
                    user_id: user.id,
                    institution,
                    degree,
                    field: field || null,
                    cgpa: item.cgpa || null,
                    location: item.location || null,
                    start_date: startDate,
                    end_date: endDate,
                    is_current: isCurrent,
                    description: item.description || null,
                },
            })
            educationKeys.add(key)
            educationAdded++
        }

        const existingWork = await prisma.workExperience.findMany({
            where: { user_id: user.id },
            select: { company: true, position: true },
        })
        const workKeys = new Set(
            existingWork.map((item) => normalizeKey(`${item.company}|${item.position}`))
        )

        let experienceAdded = 0
        for (const item of extraction.workExperience || []) {
            const company = (item.company || '').trim()
            const position = (item.position || '').trim()
            if (!company || !position) continue
            const key = normalizeKey(`${company}|${position}`)
            if (workKeys.has(key)) continue

            const isCurrent = Boolean(item.isCurrent) || /present|current/i.test(item.endDate || '')
            const startDate = parseDateValue(item.startDate)
            const endDate = isCurrent ? null : parseDateValue(item.endDate)

            await prisma.workExperience.create({
                data: {
                    user_id: user.id,
                    company,
                    position,
                    location: item.location || null,
                    start_date: startDate,
                    end_date: endDate,
                    is_current: isCurrent,
                    description: item.description || null,
                },
            })
            workKeys.add(key)
            experienceAdded++
        }

        const existingExtras = await prisma.extracurricular.findMany({
            where: { user_id: user.id },
            select: { title: true, organization: true },
        })
        const extracurricularKeys = new Set(
            existingExtras.map((item) =>
                normalizeKey(`${item.title}|${item.organization || ''}`)
            )
        )

        let extracurricularAdded = 0
        for (const item of extraction.extracurriculars || []) {
            const title = (item.title || '').trim()
            if (!title) continue
            const organization = (item.organization || '').trim()
            const key = normalizeKey(`${title}|${organization}`)
            if (extracurricularKeys.has(key)) continue

            const isCurrent = Boolean(item.isCurrent) || /present|current/i.test(item.endDate || '')
            const startDate = parseDateValue(item.startDate)
            const endDate = isCurrent ? null : parseDateValue(item.endDate)

            await prisma.extracurricular.create({
                data: {
                    user_id: user.id,
                    title,
                    organization: organization || null,
                    location: item.location || null,
                    start_date: startDate,
                    end_date: endDate,
                    is_current: isCurrent,
                    description: item.description || null,
                },
            })
            extracurricularKeys.add(key)
            extracurricularAdded++
        }

        const existingAwards = await prisma.award.findMany({
            where: { user_id: user.id },
            select: { title: true, issuer: true },
        })
        const awardKeys = new Set(
            existingAwards.map((item) =>
                normalizeKey(`${item.title}|${item.issuer || ''}`)
            )
        )

        let awardsAdded = 0
        for (const item of extraction.awards || []) {
            const title = (item.title || '').trim()
            if (!title) continue
            const issuer = (item.issuer || '').trim()
            const key = normalizeKey(`${title}|${issuer}`)
            if (awardKeys.has(key)) continue

            const awardedAt = parseDateValue(item.awardedAt)

            await prisma.award.create({
                data: {
                    user_id: user.id,
                    title,
                    issuer: issuer || null,
                    awarded_at: awardedAt,
                    description: item.description || null,
                },
            })
            awardKeys.add(key)
            awardsAdded++
        }

        const existingPublications = await prisma.publication.findMany({
            where: { user_id: user.id },
            select: { title: true, venue: true, url: true },
        })
        const publicationKeys = new Set(
            existingPublications.map((item) =>
                normalizeKey(`${item.title}|${item.venue || ''}|${item.url || ''}`)
            )
        )

        let publicationsAdded = 0
        for (const item of extraction.publications || []) {
            const title = (item.title || '').trim()
            if (!title) continue
            const venue = (item.venue || '').trim()
            const url = (item.url || '').trim()
            const key = normalizeKey(`${title}|${venue}|${url}`)
            if (publicationKeys.has(key)) continue

            const publishedAt = parseDateValue(item.publishedAt)

            await prisma.publication.create({
                data: {
                    user_id: user.id,
                    title,
                    venue: venue || null,
                    url: url || null,
                    published_at: publishedAt,
                    description: item.description || null,
                },
            })
            publicationKeys.add(key)
            publicationsAdded++
        }

        const draft = await prisma.analysisDraft.findUnique({
            where: { user_id: user.id },
        })

        const existingManualProjects = Array.isArray(draft?.manual_projects_jsonb)
            ? (draft?.manual_projects_jsonb as any[])
            : []
        const existingManualSkills = Array.isArray(draft?.manual_skills_jsonb)
            ? (draft?.manual_skills_jsonb as string[])
            : []
        const existingSelectedIds = Array.isArray(draft?.selected_project_ids_jsonb)
            ? (draft?.selected_project_ids_jsonb as string[])
            : []

        const manualProjectNames = new Set(
            existingManualProjects
                .map((project) => (project?.name ? normalizeKey(String(project.name)) : ''))
                .filter(Boolean)
        )

        const newProjects: any[] = []
        const newSelectedIds: string[] = []
        for (const project of extraction.projects || []) {
            const name = (project.name || '').trim()
            if (!name) continue
            const normalizedName = normalizeKey(name)
            if (manualProjectNames.has(normalizedName)) continue

            const id = `resume-${crypto.randomUUID()}`
            newProjects.push({
                id,
                name,
                description: project.description || '',
                technologies: Array.isArray(project.technologies) ? project.technologies : [],
                notes: [],
            })
            newSelectedIds.push(id)
            manualProjectNames.add(normalizedName)
        }

        const skillSet = new Set(existingManualSkills.map((skill) => normalizeKey(skill)))
        const mergedSkills = [...existingManualSkills]
        for (const skill of extraction.skills || []) {
            if (!skill || typeof skill !== 'string') continue
            const normalizedSkill = normalizeKey(skill)
            if (!normalizedSkill) continue
            if (skillSet.has(normalizedSkill)) continue
            skillSet.add(normalizedSkill)
            mergedSkills.push(skill.trim())
        }

        const updatedManualProjects = [...existingManualProjects, ...newProjects]
        const updatedSelected = Array.from(
            new Set([...existingSelectedIds, ...newSelectedIds])
        )

        await prisma.analysisDraft.upsert({
            where: { user_id: user.id },
            create: {
                user_id: user.id,
                selected_project_ids_jsonb: updatedSelected,
                manual_projects_jsonb: updatedManualProjects,
                project_bullets_jsonb: draft?.project_bullets_jsonb || {},
                skills_jsonb: draft?.skills_jsonb || [],
                manual_skills_jsonb: mergedSkills,
                excluded_skills_jsonb: draft?.excluded_skills_jsonb || [],
                template_id: draft?.template_id || 'modern',
            },
            update: {
                selected_project_ids_jsonb: updatedSelected,
                manual_projects_jsonb: updatedManualProjects,
                manual_skills_jsonb: mergedSkills,
            },
        })

        return NextResponse.json({
            success: true,
            summary: {
                skills: mergedSkills.length - existingManualSkills.length,
                projects: newProjects.length,
                education: educationAdded,
                experience: experienceAdded,
                extracurriculars: extracurricularAdded,
                awards: awardsAdded,
                publications: publicationsAdded,
                contactFields: Object.keys(contactUpdates).length,
            },
        })
    } catch (error: any) {
        console.error('[Resume Import] Error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to import resume.' },
            { status: 500 }
        )
    }
}
