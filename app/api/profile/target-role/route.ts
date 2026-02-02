import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateJobDescription } from '@/lib/openai'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { target_role, job_description } = await req.json()

        if (!target_role) {
            return NextResponse.json({ error: 'Target role is required' }, { status: 400 })
        }

        // 1. Generate/Cache the job description analysis
        const analysis = await generateJobDescription(target_role)

        // 2. Update user profile
        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: {
                target_role: target_role,
                job_description_jsonb: {
                    raw_jd: job_description || '',
                    analysis: analysis,
                    last_updated: new Date().toISOString()
                }
            }
        })

        return NextResponse.json({
            success: true,
            analysis: analysis
        })

    } catch (error) {
        console.error('Target role update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
