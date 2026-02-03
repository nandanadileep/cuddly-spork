import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeProject } from '@/lib/openai'
import { GitHubClient } from '@/lib/platforms/github'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectIds } = await req.json()

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'Project IDs required' }, { status: 400 })
        }

        // 1. Get user and target role analysis
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                target_role: true,
                job_description_jsonb: true,
            }
        })

        const targetRole = user?.target_role
        const jobAnalysis = (user?.job_description_jsonb as any)?.analysis

        // 2. Get GitHub token if needed
        const githubConnection = await prisma.platformConnection.findUnique({
            where: {
                user_id_platform: {
                    user_id: session.user.id,
                    platform: 'github'
                }
            }
        })

        // NOTE: In a real app, you'd decrypt the token. For this demo, we'll assume it's available or use public access.
        const githubToken = githubConnection?.access_token_encrypted // Assuming stored raw or decrypted elsewhere for now

        const githubClient = new GitHubClient(githubToken || undefined)

        // 3. Fetch projects to analyze
        const projects = await prisma.project.findMany({
            where: {
                id: { in: projectIds },
                user_id: session.user.id
            }
        })

        const results = []

        for (const project of projects) {
            try {
                const alreadyAnalyzedForRole =
                    (project.analyzed_for_role || null) === (targetRole || null) &&
                    project.ai_analysis_jsonb &&
                    project.ai_score !== null

                if (alreadyAnalyzedForRole) {
                    results.push({
                        id: project.id,
                        success: true,
                        score: project.ai_score,
                        cached: true
                    })
                    continue
                }

                let readmeContent = ''

                // 4. Fetch README from GitHub if possible
                if (project.platform === 'github') {
                    const urlParts = project.url.split('/')
                    const owner = urlParts[urlParts.length - 2]
                    const repoName = urlParts[urlParts.length - 1]

                    if (owner && repoName) {
                        readmeContent = await githubClient.fetchReadme(owner, repoName) || ''
                    }
                }

                // 5. Run AI Analysis
                const analysis = await analyzeProject({
                    name: project.name,
                    description: (project.description || '') + '\n\n' + readmeContent,
                    language: project.language,
                    url: project.url,
                    stars: project.stars || 0,
                    technologies: project.technologies_jsonb as string[],
                    targetRole: targetRole || undefined,
                    requiredSkills: jobAnalysis?.requiredSkills,
                    jobKeywords: jobAnalysis?.keywords
                })

                const analysisWithContext = {
                    ...analysis,
                    readme_excerpt: readmeContent ? readmeContent.slice(0, 2000) : null
                }

                // 6. Update Database
                const updatedProject = await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        ai_score: analysis.score,
                        ai_analysis_jsonb: analysisWithContext as any,
                        analyzed_for_role: targetRole
                    }
                })

                results.push({
                    id: project.id,
                    success: true,
                    score: analysis.score
                })
            } catch (err) {
                console.error(`Error analyzing project ${project.id}:`, err)
                results.push({
                    id: project.id,
                    success: false,
                    error: err instanceof Error ? err.message : 'Analysis failed'
                })
            }
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (error) {
        console.error('[Project Analysis] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
