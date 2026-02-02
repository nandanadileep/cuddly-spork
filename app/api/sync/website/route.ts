import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { load } from 'cheerio'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { url } = await req.json()
        if (!url) {
            return NextResponse.json({ error: 'Missing website URL' }, { status: 400 })
        }

        const response = await fetch(url, { method: 'GET' })
        const html = await response.text()
        const $ = load(html)

        const title = $('title').first().text().trim()
        const description =
            $('meta[name="description"]').attr('content')?.trim() ||
            $('meta[property="og:description"]').attr('content')?.trim() ||
            ''

        const metadata = {
            url,
            title,
            description
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                website_url: url,
                website_metadata_jsonb: metadata
            }
        })

        return NextResponse.json({ success: true, metadata })
    } catch (error) {
        console.error('Website sync error:', error)
        return NextResponse.json({ error: 'Failed to fetch website metadata' }, { status: 500 })
    }
}
