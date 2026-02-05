import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const normalizeBitbucketUsername = (value: string) => {
    const trimmed = value.trim()
    try {
        const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        const url = new URL(withProtocol)
        if (url.hostname.includes('bitbucket.org')) {
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

        const normalized = normalizeBitbucketUsername(username)
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid Bitbucket username' }, { status: 400 })
        }

        const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(normalized)}?pagelen=100`)
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch Bitbucket repos' }, { status: 502 })
        }
        const data = await response.json()
        const repos = Array.isArray(data.values) ? data.values : []

        let created = 0
        let updated = 0
        let removed = 0

        for (const repo of repos) {
            if (repo?.is_fork) {
                const existingFork = await prisma.project.findFirst({
                    where: {
                        user_id: session.user.id,
                        platform: 'bitbucket',
                        external_id: String(repo.uuid || repo.slug),
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

            const externalId = String(repo.uuid || repo.slug)
            const existing = await prisma.project.findFirst({
                where: {
                    user_id: session.user.id,
                    platform: 'bitbucket',
                    external_id: externalId,
                },
            })

            const payload = {
                name: repo.name || repo.slug,
                description,
                url: repo.links?.html?.href || '',
                stars: 0,
                forks: repo.forks_count || 0,
                language: repo.language || null,
                technologies_jsonb: [],
                ai_score: null,
                ai_analysis_jsonb: null,
                analyzed_for_role: null,
            }

            if (existing) {
                await prisma.project.update({ where: { id: existing.id }, data: payload })
                updated++
            } else {
                await prisma.project.create({
                    data: {
                        user_id: session.user.id,
                        platform: 'bitbucket',
                        external_id: externalId,
                        ...payload,
                    },
                })
                created++
            }
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'bitbucket' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: repos.length, created, updated, removed } })
    } catch (error) {
        console.error('[Bitbucket Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync Bitbucket' }, { status: 500 })
    }
}
