import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const normalizeHandle = (value: string) => {
    const trimmed = value.trim()
    try {
        const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        const url = new URL(withProtocol)
        if (url.hostname.includes('codeforces.com')) {
            const parts = url.pathname.split('/').filter(Boolean)
            const idx = parts.indexOf('profile')
            if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
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
            return NextResponse.json({ error: 'Handle required' }, { status: 400 })
        }

        const handle = normalizeHandle(username)
        if (!handle) {
            return NextResponse.json({ error: 'Invalid Codeforces handle' }, { status: 400 })
        }

        const response = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`)
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch Codeforces profile' }, { status: 502 })
        }
        const data = await response.json()
        const user = Array.isArray(data.result) ? data.result[0] : null
        if (!user) {
            return NextResponse.json({ error: 'Codeforces user not found' }, { status: 404 })
        }

        const externalId = `profile:${handle}`
        const existing = await prisma.project.findFirst({
            where: { user_id: session.user.id, platform: 'codeforces', external_id: externalId },
        })

        const payload = {
            name: `Codeforces • ${handle}`,
            description: `Rating ${user.rating || 'N/A'} • Max ${user.maxRating || 'N/A'}`,
            url: `https://codeforces.com/profile/${handle}`,
            stars: user.rating || 0,
            forks: null,
            language: 'Competitive Coding',
            technologies_jsonb: [user.rank, user.maxRank].filter(Boolean),
            ai_score: null,
            ai_analysis_jsonb: null,
            analyzed_for_role: null,
        }

        if (existing) {
            await prisma.project.update({ where: { id: existing.id }, data: payload })
        } else {
            await prisma.project.create({
                data: {
                    user_id: session.user.id,
                    platform: 'codeforces',
                    external_id: externalId,
                    ...payload,
                },
            })
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'codeforces' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: 1, created: existing ? 0 : 1, updated: existing ? 1 : 0 } })
    } catch (error) {
        console.error('[Codeforces Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync Codeforces' }, { status: 500 })
    }
}
