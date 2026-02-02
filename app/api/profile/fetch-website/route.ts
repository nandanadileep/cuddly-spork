import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

/**
 * Fetch a URL and extract title, description, and basic meta for "fetch from website" in onboarding.
 * Does not require auth so user can try before saving.
 */
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json()
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        let href = url.trim()
        if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href
        }

        const response = await fetch(href, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ResumeBuilder/1.0)',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: `Could not fetch URL: ${response.status}` },
                { status: 400 }
            )
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text().trim() ||
            null
        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            null

        return NextResponse.json({
            success: true,
            data: { title, description, url: href },
        })
    } catch (error) {
        console.error('Fetch website error:', error)
        return NextResponse.json(
            { error: 'Could not fetch this URL. Check that it is public and try again.' },
            { status: 400 }
        )
    }
}
