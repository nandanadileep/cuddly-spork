import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { linkedinUrl, platforms } = await req.json()

        // 1. Update User Profile
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                linkedin_url: linkedinUrl || null,
                onboarding_completed: true,
            },
        })

        // 2. Save Manual Platform Connections
        // We'll treat these as "manual" connections in the platform_connections table
        // Or simpler: just save them if we had a dedicated manuals table, but let's reuse platformConnection
        // For simplicity, we might iterate and check if we can store them.

        // Currently our schema for PlatformConnection expects 'platform' and 'username'/'access_token'
        // We can store manual links. 

        for (const p of platforms) {
            if (p.url) {
                // If it's a full URL, try to extract username, or store URL in metadata
                // For manual links, we'll store the URL as metadata or username if possible

                await prisma.platformConnection.upsert({
                    where: {
                        user_id_platform: {
                            user_id: session.user.id,
                            platform: p.id,
                        },
                    },
                    create: {
                        user_id: session.user.id,
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

        // Logic to trigger fetch for specific platforms could go here (e.g. valid github public url -> fetch repos)
        // For now, return success.

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Onboarding API error:', error)
        return NextResponse.json(
            { error: 'Failed to complete onboarding' },
            { status: 500 }
        )
    }
}
