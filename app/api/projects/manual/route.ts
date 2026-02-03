import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            url,
            title,
            description,
            keywords = [],
            platform = 'custom',
        } = body || {}

        if (!url || !title) {
            return NextResponse.json({ error: 'URL and title are required' }, { status: 400 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
            : userEmail
                ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const project = await prisma.project.upsert({
            where: {
                user_id_platform_external_id: {
                    user_id: userRecord.id,
                    platform,
                    external_id: url,
                }
            },
            create: {
                user_id: userRecord.id,
                platform,
                external_id: url,
                name: title,
                description: description || null,
                url,
                technologies_jsonb: Array.isArray(keywords) ? keywords : [],
            },
            update: {
                name: title,
                description: description || null,
                url,
                technologies_jsonb: Array.isArray(keywords) ? keywords : [],
            }
        })

        return NextResponse.json({ success: true, project })
    } catch (error) {
        console.error('[Manual Project] Error:', error)
        return NextResponse.json({ error: 'Failed to save project' }, { status: 500 })
    }
}
