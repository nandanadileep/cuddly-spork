import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { linkedinUrl, targetRole, platforms = [] } = body

        console.log('Onboarding request:', { linkedinUrl, targetRole, platforms })

        // 0. Generate AI Analysis for target role if provided
        let jobDescriptionJsonb = null
        if (targetRole) {
            try {
                const { generateJobDescription } = await import('@/lib/openai')
                const analysis = await generateJobDescription(targetRole)
                jobDescriptionJsonb = {
                    raw_jd: '',
                    analysis: analysis,
                    last_updated: new Date().toISOString()
                }
            } catch (error) {
                console.error('Failed to generate job description in onboarding:', error)
            }
        }

        // 1. Update User Profile
        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
            : userEmail
                ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        await prisma.user.update({
            where: { id: userRecord.id },
            data: {
                linkedin_url: linkedinUrl || null,
                target_role: targetRole || null,
                job_description_jsonb: jobDescriptionJsonb || undefined,
                onboarding_completed: true,
            },
        })

        // 2. Save Manual Platform Connections
        // We'll treat these as "manual" connections in the platform_connections table
        // Or simpler: just save them if we had a dedicated manuals table, but let's reuse platformConnection
        // For simplicity, we might iterate and check if we can store them.

        // Currently our schema for PlatformConnection expects 'platform' and 'username'/'access_token'
        // We can store manual links. 

        if (Array.isArray(platforms) && platforms.length > 0) {
            for (const p of platforms) {
                if (p?.url && p?.id) {
                    // If it's a full URL, try to extract username, or store URL in metadata
                    // For manual links, we'll store the URL as metadata or username if possible

                    await prisma.platformConnection.upsert({
                        where: {
                            user_id_platform: {
                                user_id: userRecord.id,
                                platform: p.id,
                            },
                        },
                        create: {
                            user_id: userRecord.id,
                            platform: p.id,
                            username: p.url, // Store raw input for manual
                            metadata_jsonb: { manual_url: p.url },
                            last_synced: new Date(),
                        },
                        update: {
                            username: p.url,
                            metadata_jsonb: { manual_url: p.url },
                        },
                    })
                }
            }
        }

        // Logic to trigger fetch for specific platforms could go here (e.g. valid github public url -> fetch repos)
        // For now, return success.

        console.log('Onboarding completed successfully for user:', session.user.id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Onboarding API error:', error)
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json(
            { error: 'Failed to complete onboarding', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
