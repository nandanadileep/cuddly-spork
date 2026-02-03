import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractSkills } from '@/lib/openai'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Fetch all relevant data
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                projects: {
                    select: {
                        name: true,
                        description: true,
                        technologies_jsonb: true
                    }
                },
                education: {
                    select: {
                        institution: true,
                        degree: true,
                        description: true
                    }
                },
                workExperience: {
                    select: {
                        company: true,
                        position: true,
                        description: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 2. Prepare data for AI
        const dataItems = [
            ...user.projects.map(p => ({
                name: p.name,
                description: p.description,
                technologies: (p.technologies_jsonb as string[]) || []
            })),
            ...user.education.map(e => ({
                name: `${e.degree} at ${e.institution}`,
                description: e.description,
                technologies: []
            })),
            ...user.workExperience.map(w => ({
                name: `${w.position} at ${w.company}`,
                description: w.description,
                technologies: []
            }))
        ]

        if (dataItems.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No data found to extract skills from. Please import projects or add experience.'
            }, { status: 400 })
        }

        // 3. Extract skills using AI
        let skills: string[] = []
        try {
            skills = await extractSkills(dataItems)
        } catch (error: any) {
            const isRateLimit = error?.status === 429 || error?.code === 'rate_limit_exceeded'
            if (isRateLimit) {
                const draft = await prisma.analysisDraft.findUnique({
                    where: { user_id: session.user.id },
                    select: { skills_jsonb: true }
                })
                const cachedSkills = Array.isArray(draft?.skills_jsonb) ? (draft?.skills_jsonb as string[]) : []
                return NextResponse.json({
                    success: cachedSkills.length > 0,
                    skills: cachedSkills,
                    cached: cachedSkills.length > 0,
                    error: 'Rate limit reached. Please try again shortly.'
                }, { status: 429 })
            }
            throw error
        }

        // 4. Update user profile (or just return them for now)
        // We can store these in the user profile if we have a field, 
        // or just return them to be saved in a resume draft.
        // Let's assume we return them for the user to review.

        return NextResponse.json({
            success: true,
            skills
        })

    } catch (error) {
        console.error('[Skill Extraction] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
