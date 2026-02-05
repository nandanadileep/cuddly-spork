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

        const normalizeGithubUsername = (value: string) => {
            const trimmed = value.trim()
            try {
                const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
                const url = new URL(withProtocol)
                if (url.hostname.includes('github.com')) {
                    const parts = url.pathname.split('/').filter(Boolean)
                    if (parts[0]) return parts[0]
                }
            } catch {
                // fall through
            }
            return trimmed.replace(/^@/, '').split('/')[0]
        }

        let rawUsername = username
        if (!rawUsername) {
            const connection = await prisma.platformConnection.findUnique({
                where: {
                    user_id_platform: {
                        user_id: session.user.id,
                        platform: 'github'
                    }
                },
                select: { username: true, metadata_jsonb: true }
            })
            rawUsername = connection?.metadata_jsonb?.manual_url || connection?.username || ''
        }

        if (!rawUsername) {
            return NextResponse.json({ error: 'GitHub username required' }, { status: 400 })
        }

        const normalizedUsername = normalizeGithubUsername(rawUsername)
        if (!normalizedUsername) {
            return NextResponse.json({ error: 'Invalid GitHub username or URL' }, { status: 400 })
        }

        console.log(`[GitHub Sync] Starting sync for user ${session.user.id}, username: ${normalizedUsername}`)

        // Fetch repos from GitHub
        const result = await fetchGitHubRepos(normalizedUsername)

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
        let removed = 0

        for (const repo of repos) {
            if (repo.fork) {
                const existingFork = await prisma.project.findFirst({
                    where: {
                        user_id: session.user.id,
                        platform: 'github',
                        external_id: repo.id.toString()
                    }
                })
                if (existingFork) {
                    await prisma.project.delete({ where: { id: existingFork.id } })
                    removed++
                }
                continue
            }
            const technologies = extractTechnologies(repo)
            const description = (repo.description || '').trim()
            const isEmptyProject =
                !repo.name ||
                (description.length === 0 &&
                    !repo.language &&
                    (repo.stargazers_count || 0) === 0 &&
                    (repo.forks_count || 0) === 0 &&
                    technologies.length === 0)

            if (isEmptyProject) {
                continue
            }

            const existingProject = await prisma.project.findFirst({
                where: {
                    user_id: session.user.id,
                    platform: 'github',
                    external_id: repo.id.toString()
                }
            })

            if (existingProject) {
                const existingTechnologies = Array.isArray(existingProject.technologies_jsonb)
                    ? [...(existingProject.technologies_jsonb as string[])].sort()
                    : []
                const nextTechnologies = [...technologies].sort()

                const isUnchanged =
                    existingProject.name === repo.name &&
                    (existingProject.description || '').trim() === description &&
                    (existingProject.stars || 0) === (repo.stargazers_count || 0) &&
                    (existingProject.forks || 0) === (repo.forks_count || 0) &&
                    (existingProject.language || '') === (repo.language || '') &&
                    JSON.stringify(existingTechnologies) === JSON.stringify(nextTechnologies)

                if (isUnchanged) {
                    continue
                }

                // Update existing project
                await prisma.project.update({
                    where: { id: existingProject.id },
                    data: {
                        name: repo.name,
                        description,
                        url: repo.html_url,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        language: repo.language,
                        technologies_jsonb: technologies,
                        ai_score: null,
                        ai_analysis_jsonb: null,
                        analyzed_for_role: null,
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
                        description,
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
                updated,
                removed
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
