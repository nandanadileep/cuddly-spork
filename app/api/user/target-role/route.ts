import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { generateJobDescription, GeneratedJobDescription } from '@/lib/openai'

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { targetRole, jobDescription: userProvidedDescription } = body

        if (!targetRole) {
            return NextResponse.json(
                { error: 'Target role is required' },
                { status: 400 }
            )
        }

        // Check if we already have this role cached
        let existingUser
        try {
            existingUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    target_role: true,
                    job_description_jsonb: true,
                },
            })
        } catch {
            existingUser = null
        }

        let jobDescriptionData: GeneratedJobDescription | null = null

        // If role is the same and we have cached data, use it
        const cachedData = existingUser?.job_description_jsonb as any
        if (existingUser?.target_role === targetRole && cachedData?.title) {
            console.log('🎯 Using cached job description for:', targetRole)
            jobDescriptionData = cachedData as GeneratedJobDescription
        } else {
            // New role - generate description with LLM
            console.log('🤖 Generating new job description for:', targetRole)

            if (userProvidedDescription) {
                // User provided their own description - just store basic info
                jobDescriptionData = {
                    title: targetRole,
                    summary: userProvidedDescription,
                    requiredSkills: [],
                    preferredSkills: [],
                    responsibilities: [],
                    keywords: targetRole.toLowerCase().split(' '),
                    experienceLevel: 'Mid',
                    industry: ['technology'],
                }
            } else {
                // Generate with LLM
                jobDescriptionData = await generateJobDescription(targetRole)
            }
        }

        // Update user's target role with generated/cached description
        try {
            const user = await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    target_role: targetRole,
                    job_description_jsonb: jobDescriptionData as any,
                },
                select: {
                    id: true,
                    target_role: true,
                    job_description_jsonb: true,
                },
            })

            return NextResponse.json({
                success: true,
                targetRole: user.target_role,
                jobDescription: user.job_description_jsonb,
                cached: existingUser?.target_role === targetRole,
            })
        } catch (dbError) {
            // Database may not have columns yet
            console.log('Database update error (columns may not exist):', dbError)
            return NextResponse.json({
                success: true,
                targetRole: targetRole,
                jobDescription: jobDescriptionData,
                cached: false,
            })
        }
    } catch (error) {
        console.error('Error updating target role:', error)
        return NextResponse.json(
            { error: 'Failed to update target role' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    target_role: true,
                    job_description_jsonb: true,
                },
            })

            return NextResponse.json({
                targetRole: user?.target_role || null,
                jobDescription: user?.job_description_jsonb || null,
            })
        } catch (dbError) {
            // If column doesn't exist in database yet, return null
            console.log('Target role column may not exist yet:', dbError)
            return NextResponse.json({
                targetRole: null,
                jobDescription: null,
            })
        }
    } catch (error) {
        console.error('Error fetching target role:', error)
        return NextResponse.json({
            targetRole: null,
            jobDescription: null,
        })
    }
}
