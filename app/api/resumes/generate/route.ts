import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name = 'My Resume', selectedProjectIds } = body

        // Fetch user's target role
        let targetRole: string | null = null
        let userName: string | null = null
        let userEmail: string | null = null
        try {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { target_role: true, name: true, email: true },
            })
            targetRole = user?.target_role || null
            userName = user?.name || session.user.name || null
            userEmail = user?.email || session.user.email || null
        } catch {
            userName = session.user.name || null
            userEmail = session.user.email || null
        }

        // Fetch selected projects with analysis (or top scored if none selected)
        let projects = await prisma.project.findMany({
            where: {
                user_id: session.user.id,
                ...(selectedProjectIds
                    ? { id: { in: selectedProjectIds } }
                    : { is_selected: true }),
                ai_score: { not: null },
            },
            orderBy: { ai_score: 'desc' },
        })

        // If no projects selected, auto-select top 5 by score
        if (projects.length === 0) {
            projects = await prisma.project.findMany({
                where: {
                    user_id: session.user.id,
                    ai_score: { gte: 50 }, // Only include high-scoring projects
                },
                orderBy: { ai_score: 'desc' },
                take: 5,
            })
        }

        if (projects.length === 0) {
            return NextResponse.json(
                { error: 'No analyzed projects found. Please analyze projects first.' },
                { status: 400 }
            )
        }

        // Aggregate skills from projects
        const skillCounts: Map<string, number> = new Map()
        const projectSections = []

        for (const project of projects) {
            const aiAnalysis = project.ai_analysis_jsonb as any
            const techs = (project.technologies_jsonb as string[]) || []
            const aiTechStack = aiAnalysis?.techStack || []

            // Collect skills
            for (const skill of [...techs, ...aiTechStack]) {
                if (skill && typeof skill === 'string') {
                    const count = skillCounts.get(skill) || 0
                    skillCounts.set(skill, count + 1)
                }
            }

            // Build project section
            projectSections.push({
                id: project.id,
                name: project.name,
                url: project.url,
                description: aiAnalysis?.summary || project.description || '',
                bulletPoints: aiAnalysis?.bulletPoints || [],
                technologies: aiTechStack.length > 0 ? aiTechStack : techs,
                score: project.ai_score,
            })
        }

        // Sort skills by frequency and take top ones
        const topSkills = Array.from(skillCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([skill]) => skill)

        // Generate professional summary using AI
        let summary = ''
        try {
            const summaryPrompt = targetRole
                ? `Write a 2-3 sentence professional summary for a ${targetRole} with experience in: ${topSkills.slice(0, 8).join(', ')}. Focus on technical expertise and impact.`
                : `Write a 2-3 sentence professional summary for a software developer with experience in: ${topSkills.slice(0, 8).join(', ')}. Focus on technical expertise and impact.`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert resume writer. Write concise, impactful professional summaries. No fluff, focus on skills and value.',
                    },
                    { role: 'user', content: summaryPrompt },
                ],
                max_tokens: 200,
                temperature: 0.7,
            })
            summary = response.choices[0]?.message?.content || ''
        } catch (error) {
            console.error('Error generating summary:', error)
            summary = `Experienced developer with expertise in ${topSkills.slice(0, 5).join(', ')}.`
        }

        // Build resume content
        const resumeContent = {
            name,
            targetRole,
            createdAt: new Date().toISOString(),
            personalInfo: {
                fullName: userName || '',
                email: userEmail || '',
                phone: '',
                location: '',
                linkedin: '',
                github: '',
                website: '',
            },
            summary,
            skills: topSkills,
            projects: projectSections,
            education: [],
            experience: [],
        }

        // Store resume in database using correct schema fields
        const resume = await prisma.resume.create({
            data: {
                user_id: session.user.id,
                title: name,
                target_role: targetRole,
                template_id: 'modern',
                latex_content: JSON.stringify(resumeContent), // Store as JSON string in latex_content for now
                selected_projects_jsonb: projects.map(p => p.id),
                skills_jsonb: topSkills,
            },
        })

        return NextResponse.json({
            success: true,
            resume: {
                id: resume.id,
                name: resume.title,
                template: resume.template_id,
                content: resumeContent,
            },
        })
    } catch (error) {
        console.error('Error generating resume:', error)
        return NextResponse.json(
            { error: 'Failed to generate resume' },
            { status: 500 }
        )
    }
}

// GET - List user's resumes
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resumes = await prisma.resume.findMany({
            where: { user_id: session.user.id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                title: true,
                template_id: true,
                target_role: true,
                created_at: true,
                updated_at: true,
            },
        })

        // Transform to match expected format
        const formattedResumes = resumes.map(r => ({
            id: r.id,
            name: r.title,
            template: r.template_id,
            targetRole: r.target_role,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))

        return NextResponse.json({ resumes: formattedResumes })
    } catch (error) {
        console.error('Error fetching resumes:', error)
        return NextResponse.json(
            { error: 'Failed to fetch resumes' },
            { status: 500 }
        )
    }
}
