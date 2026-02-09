import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { linkedinUrl, targetRole, websiteUrl, platforms = [], skipRoleSnapshot } = body

        console.log('Onboarding request:', { linkedinUrl, targetRole, websiteUrl, platforms })

        // 1. Identify user up-front
        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, target_role: true, job_description_jsonb: true } })
            : userEmail
                ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, target_role: true, job_description_jsonb: true } })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 2. Generate role snapshot if needed
        const trimmedTargetRole = typeof targetRole === 'string' ? targetRole.trim() : ''
        let jobDescriptionJsonb: Prisma.InputJsonValue | undefined = undefined

        if (trimmedTargetRole && !skipRoleSnapshot) {
            const hasExistingSnapshot = userRecord.target_role === trimmedTargetRole && !!userRecord.job_description_jsonb

            if (!hasExistingSnapshot) {
                try {
                    const { generateJobDescription } = await import('@/lib/openai')
                    const analysis = await generateJobDescription(trimmedTargetRole)
                    const analysisJson = analysis
                        ? (JSON.parse(JSON.stringify(analysis)) as Prisma.InputJsonValue)
                        : null
                    jobDescriptionJsonb = {
                        raw_jd: '',
                        analysis: analysisJson,
                        last_updated: new Date().toISOString()
                    } as Prisma.InputJsonValue
                } catch (error) {
                    console.error('Failed to generate job description in onboarding:', error)
                }
            }
        }

        // 3. Update User Profile
        const userUpdate: Prisma.UserUpdateInput = { onboarding_completed: true }
        if (typeof linkedinUrl === 'string') {
            userUpdate.linkedin_url = linkedinUrl.trim() || null
        }
        if (typeof websiteUrl === 'string') {
            const trimmed = websiteUrl.trim()
            if (!trimmed) {
                userUpdate.website = null
            } else {
                try {
                    const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
                        ? trimmed
                        : `https://${trimmed}`
                    userUpdate.website = new URL(normalized).toString()
                } catch {
                    // Ignore invalid URLs instead of failing onboarding.
                }
            }
        }
        if (typeof targetRole === 'string') {
            userUpdate.target_role = trimmedTargetRole || null
        }
        if (jobDescriptionJsonb !== undefined) {
            userUpdate.job_description_jsonb = jobDescriptionJsonb
        }

        await prisma.user.update({
            where: { id: userRecord.id },
            data: userUpdate,
        })

        // 4. Save Manual Platform Connections
        // We'll treat these as "manual" connections in the platform_connections table
        // Or simpler: just save them if we had a dedicated manuals table, but let's reuse platformConnection
        // For simplicity, we might iterate and check if we can store them.

        // Currently our schema for PlatformConnection expects 'platform' and 'username'/'access_token'
        // We can store manual links. 

        const normalizePlatformInput = (platformId: string, value: string) => {
            const trimmed = value.trim()
            if (platformId !== 'github') return { username: trimmed, manualUrl: trimmed }
            try {
                const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
                const url = new URL(withProtocol)
                if (url.hostname.includes('github.com')) {
                    const parts = url.pathname.split('/').filter(Boolean)
                    if (parts[0]) return { username: parts[0], manualUrl: trimmed }
                }
            } catch {
                // fall through
            }
            return { username: trimmed.replace(/^@/, '').split('/')[0], manualUrl: trimmed }
        }

        if (Array.isArray(platforms) && platforms.length > 0) {
            for (const p of platforms) {
                if (p?.url && p?.id) {
                    const normalized = normalizePlatformInput(p.id, p.url)

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
                            username: normalized.username,
                            metadata_jsonb: { manual_url: normalized.manualUrl },
                            last_synced: new Date(),
                        },
                        update: {
                            username: normalized.username,
                            metadata_jsonb: { manual_url: normalized.manualUrl },
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
