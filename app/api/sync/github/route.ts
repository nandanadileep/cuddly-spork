import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchGitHubRepos, extractTechnologies } from '@/lib/services/github'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { username } = await req.json()

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 })
        }

        console.log(`[GitHub Sync] Starting sync for user ${session.user.id}, username: ${username}`)

        // Fetch repos from GitHub
        const result = await fetchGitHubRepos(username)

        if (!result.success) {
            console.error('[GitHub Sync] Failed:', result.error)
            return NextResponse.json({
                success: false,
                error: result.error,
                rateLimit: result.rateLimit
            }, { status: 400 })
        }

        const repos = result.repos || []
        console.log(`[GitHub Sync] Fetched ${repos.length} repositories`)

        // Store repos in database
        let created = 0
        let updated = 0

        for (const repo of repos) {
            const technologies = extractTechnologies(repo)

            const existingProject = await prisma.project.findFirst({
                where: {
                    user_id: session.user.id,
                    platform: 'github',
                    external_id: repo.id.toString()
                }
            })

            if (existingProject) {
                // Update existing project
                await prisma.project.update({
                    where: { id: existingProject.id },
                    data: {
                        name: repo.name,
                        description: repo.description,
                        url: repo.html_url,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        language: repo.language,
                        technologies_jsonb: technologies,
                        updated_at: new Date()
                    }
                })
                updated++
            } else {
                // Create new project
                await prisma.project.create({
                    data: {
                        user_id: session.user.id,
                        platform: 'github',
                        external_id: repo.id.toString(),
                        name: repo.name,
                        description: repo.description,
                        url: repo.html_url,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        language: repo.language,
                        technologies_jsonb: technologies
                    }
                })
                created++
            }
        }

        // Update platform connection last_synced
        await prisma.platformConnection.updateMany({
            where: {
                user_id: session.user.id,
                platform: 'github'
            },
            data: {
                last_synced: new Date()
            }
        })

        console.log(`[GitHub Sync] Complete - Created: ${created}, Updated: ${updated}`)

        return NextResponse.json({
            success: true,
            stats: {
                total: repos.length,
                created,
                updated
            }
        })
    } catch (error) {
        console.error('[GitHub Sync] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to sync GitHub repositories' },
            { status: 500 }
        )
    }
}
