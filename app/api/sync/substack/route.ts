import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchRssFeed } from '@/lib/services/rss'

const buildSubstackFeedUrl = (value: string) => {
    const trimmed = value.trim().replace(/\/$/, '')
    if (trimmed.includes('/feed')) return trimmed
    if (trimmed.startsWith('http')) return `${trimmed}/feed`
    return `https://${trimmed}/feed`
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { username } = await req.json()
        if (!username) {
            return NextResponse.json({ error: 'Username or Substack URL required' }, { status: 400 })
        }

        const feedUrl = buildSubstackFeedUrl(username)
        const items = await fetchRssFeed(feedUrl, 20)

        let created = 0
        let updated = 0

        for (const item of items) {
            const externalId = item.link
            const existing = await prisma.project.findFirst({
                where: { user_id: session.user.id, platform: 'substack', external_id: externalId },
            })

            const payload = {
                name: item.title,
                description: item.description || item.title,
                url: item.link,
                stars: 0,
                forks: null,
                language: 'Article',
                technologies_jsonb: item.categories,
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
                        platform: 'substack',
                        external_id: externalId,
                        ...payload,
                    },
                })
                created++
            }
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'substack' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: items.length, created, updated } })
    } catch (error) {
        console.error('[Substack Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync Substack' }, { status: 500 })
    }
}
