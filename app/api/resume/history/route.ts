import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSupabaseBucket, supabaseAdmin } from '@/lib/supabase-server'

const DEFAULT_HISTORY_CLEAR_EMAIL = 'nandanadileep2002@gmail.com'

function isAllowedToClearHistory(email: string | null | undefined): boolean {
    const normalized = (email || '').trim().toLowerCase()
    if (!normalized) return false

    // Optional override for admins (comma-separated emails).
    const allowlist = (process.env.RESUME_HISTORY_CLEAR_ALLOWLIST || '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)

    if (allowlist.length > 0) return allowlist.includes(normalized)
    return normalized === DEFAULT_HISTORY_CLEAR_EMAIL
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
            : userEmail
                ? await prisma.user.findFirst({
                      where: { email: { equals: userEmail, mode: 'insensitive' } },
                      select: { id: true, email: true },
                  })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const resumes = await prisma.resume.findMany({
            where: { user_id: userRecord.id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                title: true,
                template_id: true,
                target_role: true,
                pdf_url: true,
                created_at: true,
            },
        })

        const bucket = getSupabaseBucket()
        const withUrls = await Promise.all(
            resumes.map(async (resume) => {
                let pdfUrl = resume.pdf_url || null
                if (pdfUrl && !pdfUrl.startsWith('http')) {
                    if (!supabaseAdmin) {
                        pdfUrl = null
                    } else {
                        const { data, error } = await supabaseAdmin.storage
                            .from(bucket)
                            .createSignedUrl(pdfUrl, 60 * 60)
                        if (!error && data?.signedUrl) {
                            pdfUrl = data.signedUrl
                        }
                    }
                }

                return {
                    ...resume,
                    pdfUrl,
                }
            })
        )

        return NextResponse.json({ success: true, resumes: withUrls })
    } catch (error) {
        console.error('[Resume History] Error:', error)
        return NextResponse.json({ error: 'Failed to load resume history' }, { status: 500 })
    }
}

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
            : userEmail
                ? await prisma.user.findFirst({
                      where: { email: { equals: userEmail, mode: 'insensitive' } },
                      select: { id: true, email: true },
                  })
                : null

        if (!userRecord?.id || !userRecord.email) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (!isAllowedToClearHistory(userRecord.email)) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
        }

        const deleted = await prisma.resume.deleteMany({ where: { user_id: userRecord.id } })
        return NextResponse.json({ success: true, deleted: deleted.count })
    } catch (error) {
        console.error('[Resume History] Error:', error)
        return NextResponse.json({ error: 'Failed to clear resume history' }, { status: 500 })
    }
}
