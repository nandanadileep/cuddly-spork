import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const normalizeHfUsername = (value: string) => {
    const trimmed = value.trim()
    try {
        const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        const url = new URL(withProtocol)
        if (url.hostname.includes('huggingface.co')) {
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

        const normalized = normalizeHfUsername(username)
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid Hugging Face username' }, { status: 400 })
        }

        const response = await fetch(`https://huggingface.co/api/users/${encodeURIComponent(normalized)}/overview`)
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch Hugging Face data' }, { status: 502 })
        }
        const data = await response.json()

        const items = [
            ...(data?.models || []).map((model: any) => ({
                id: model.id || model.modelId,
                name: model.id || model.modelId,
                url: `https://huggingface.co/${model.id || model.modelId}`,
                description: model.pipeline_tag || 'Model',
                tags: model.tags || [],
                type: 'Model',
            })),
            ...(data?.spaces || []).map((space: any) => ({
                id: space.id || space.name,
                name: space.id || space.name,
                url: `https://huggingface.co/spaces/${space.id || space.name}`,
                description: space.sdk || 'Space',
                tags: space.tags || [],
                type: 'Space',
            })),
            ...(data?.datasets || []).map((dataset: any) => ({
                id: dataset.id || dataset.name,
                name: dataset.id || dataset.name,
                url: `https://huggingface.co/datasets/${dataset.id || dataset.name}`,
                description: 'Dataset',
                tags: dataset.tags || [],
                type: 'Dataset',
            })),
        ]

        let created = 0
        let updated = 0

        for (const item of items) {
            if (!item?.id) continue
            const externalId = String(item.id)
            const existing = await prisma.project.findFirst({
                where: { user_id: session.user.id, platform: 'huggingface', external_id: externalId },
            })

            const payload = {
                name: item.name,
                description: item.description || item.type,
                url: item.url,
                stars: 0,
                forks: null,
                language: item.type,
                technologies_jsonb: Array.isArray(item.tags) ? (item.tags as string[]) : ([] as string[]),
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
                        platform: 'huggingface',
                        external_id: externalId,
                        ...payload,
                    },
                })
                created++
            }
        }

        await prisma.platformConnection.updateMany({
            where: { user_id: session.user.id, platform: 'huggingface' },
            data: { last_synced: new Date() },
        })

        return NextResponse.json({ success: true, stats: { total: items.length, created, updated } })
    } catch (error) {
        console.error('[Hugging Face Sync] Error:', error)
        return NextResponse.json({ error: 'Failed to sync Hugging Face' }, { status: 500 })
    }
}
