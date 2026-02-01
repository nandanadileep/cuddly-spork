import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { GitHubClient } from '@/lib/platforms/github'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { platform } = await req.json()

        if (platform !== 'github') {
            return NextResponse.json(
                { error: 'Platform not supported yet' },
                { status: 400 }
            )
        }

        // Get platform connection
        const connection = await prisma.platformConnection.findUnique({
            where: {
                user_id_platform: {
                    user_id: session.user.id,
                    platform: 'github',
                },
            },
        })

        if (!connection || !connection.access_token_encrypted) {
            return NextResponse.json(
                { error: 'Platform not connected' },
                { status: 400 }
            )
        }

        // Fetch repositories from GitHub
        const githubClient = new GitHubClient(connection.access_token_encrypted)
        const repos = await githubClient.fetchUserRepositories()

        // Store projects in database
        const createdProjects = []
        for (const repo of repos) {
            const project = await prisma.project.upsert({
                where: {
                    user_id_platform_external_id: {
                        user_id: session.user.id,
                        platform: 'github',
                        external_id: repo.externalId,
                    },
                },
                create: {
                    user_id: session.user.id,
                    platform: 'github',
                    external_id: repo.externalId,
                    name: repo.name,
                    description: repo.description,
                    url: repo.url,
                    technologies_jsonb: repo.technologies,
                    stars: repo.stars,
                    forks: repo.forks,
                    language: repo.language,
                },
                update: {
                    name: repo.name,
                    description: repo.description,
                    url: repo.url,
                    technologies_jsonb: repo.technologies,
                    stars: repo.stars,
                    forks: repo.forks,
                    language: repo.language,
                    updated_at: new Date(),
                },
            })
            createdProjects.push(project)
        }

        // Update last synced timestamp
        await prisma.platformConnection.update({
            where: {
                user_id_platform: {
                    user_id: session.user.id,
                    platform: 'github',
                },
            },
            data: {
                last_synced: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            message: `Synced ${createdProjects.length} projects from GitHub`,
            count: createdProjects.length,
        })
    } catch (error) {
        console.error('Platform sync error:', error)
        return NextResponse.json(
            { error: 'Failed to sync platform' },
            { status: 500 }
        )
    }
}
