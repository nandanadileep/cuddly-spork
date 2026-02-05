import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const normalizeDevtoUsername = (value: string) => {
    const trimmed = value.trim()
    try {
        const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        const url = new URL(withProtocol)
        if (url.hostname.includes('dev.to')) {
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

        const normalized = normalizeDevtoUsername(username)
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid Dev.to username' }, { status: 400 })
        }

        const response = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(normalized)}&per_page=100`)
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch Dev.to posts' }, { status: 502 })
        }
        const posts = await response.json()

        let created = 0
        let updated = 0

        for (const post of posts) {
            const externalId = String(post.id)
            const existing = await prisma.project.findFirst({
                where: { user_id: session.user.id, platform: 'devto', external_id: externalId },
            })

            const payload = {
                name: post.title,
                description: post.description || post.title,
                url: post.url,
                stars: post.public_reactions_count || 0,
                forks: null,
                language: 'Article',
                technologies_jsonb: Array.isArray(post.tag_list) ? post.tag_list : [],
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
                        platform: 'devto',
                        external_id: externalId,
                        ...payload,
                    },
                })
                created++
            }
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'devto' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: posts.length, created, updated } })
    } catch (error) {
        console.error('[Dev.to Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync Dev.to' }, { status: 500 })
    }
}
