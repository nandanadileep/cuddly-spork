import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const normalizeGitlabUsername = (value: string) => {
    const trimmed = value.trim()
    try {
        const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        const url = new URL(withProtocol)
        if (url.hostname.includes('gitlab.com')) {
            const parts = url.pathname.split('/').filter(Boolean)
            if (parts[0]) return parts[0]
        }
    } catch {
        // fall through
    }
    return trimmed.replace(/^@/, '').split('/')[0]
}

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

        const normalized = normalizeGitlabUsername(username)
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid GitLab username' }, { status: 400 })
        }

        const userRes = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(normalized)}`)
        if (!userRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch GitLab user' }, { status: 502 })
        }
        const users = await userRes.json()
        const user = Array.isArray(users) ? users[0] : null
        if (!user?.id) {
            return NextResponse.json({ error: 'GitLab user not found' }, { status: 404 })
        }

        const projectsRes = await fetch(`https://gitlab.com/api/v4/users/${user.id}/projects?simple=true&per_page=100&order_by=last_activity_at`)
        if (!projectsRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch GitLab projects' }, { status: 502 })
        }
        const projects = await projectsRes.json()

        let created = 0
        let updated = 0
        let removed = 0

        for (const repo of projects) {
            if (repo?.forked_from_project) {
                const existingFork = await prisma.project.findFirst({
                    where: {
                        user_id: session.user.id,
                        platform: 'gitlab',
                        external_id: String(repo.id),
                    },
                })
                if (existingFork) {
                    await prisma.project.delete({ where: { id: existingFork.id } })
                    removed++
                }
                continue
            }

            const description = (repo.description || '').trim()
            const isEmpty = !repo.name && !description
            if (isEmpty) continue

            const existing = await prisma.project.findFirst({
                where: {
                    user_id: session.user.id,
                    platform: 'gitlab',
                    external_id: String(repo.id),
                },
            })

            const payload = {
                name: repo.name,
                description,
                url: repo.web_url,
                stars: repo.star_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language || null,
                technologies_jsonb: Array.isArray(repo.topics) ? (repo.topics as string[]) : ([] as string[]),
                ai_score: null,
                ai_analysis_jsonb: Prisma.DbNull,
                analyzed_for_role: null,
            }

            if (existing) {
                await prisma.project.update({ where: { id: existing.id }, data: payload })
                updated++
            } else {
                await prisma.project.create({
                    data: {
                        user_id: session.user.id,
                        platform: 'gitlab',
                        external_id: String(repo.id),
                        ...payload,
                    },
                })
                created++
            }
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'gitlab' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: projects.length, created, updated, removed } })
    } catch (error) {
        console.error('[GitLab Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync GitLab' }, { status: 500 })
    }
}
