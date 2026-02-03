import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { load } from 'cheerio'

const isValidUrl = (value: string) => {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

const normalizeUrl = (value: URL) => {
    const normalized = new URL(value.toString())
    normalized.hash = ''
    normalized.search = ''
    normalized.pathname = normalized.pathname.replace(/\/$/, '')
    return normalized.toString()
}

const detectPlatform = (url: URL) => {
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'github.com') return 'github'
    if (host === 'kaggle.com') return 'kaggle'
    if (host === 'figma.com') return 'figma'
    if (host === 'behance.net') return 'behance'
    if (host === 'dribbble.com') return 'dribbble'
    if (host === 'medium.com') return 'medium'
    if (host === 'dev.to') return 'devto'
    if (host === 'hashnode.com') return 'hashnode'
    if (host.endsWith('substack.com')) return 'substack'
    if (host === 'producthunt.com') return 'producthunt'
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube'
    if (host === 'vimeo.com') return 'vimeo'
    if (host === 'codepen.io') return 'codepen'
    if (host === 'codesandbox.io') return 'codesandbox'
    if (host === 'stackblitz.com') return 'stackblitz'
    if (host === 'npmjs.com') return 'npm'
    if (host === 'pypi.org') return 'pypi'
    if (host === 'huggingface.co') return 'huggingface'
    if (host === 'kaggle.com') return 'kaggle'
    return host
}

const tryFetchGithubRepo = async (url: URL) => {
    if (url.hostname !== 'github.com') return null
    const [owner, repo] = url.pathname.split('/').filter(Boolean)
    if (!owner || !repo) return null

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
            Accept: 'application/vnd.github+json',
        },
    })

    if (!response.ok) return null
    const data = await response.json()

    return {
        title: data.name || repo,
        description: data.description || '',
        keywords: Array.isArray(data.topics) ? data.topics : [],
        siteName: 'GitHub',
        language: data.language || null,
        platform: 'github'
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const urlString = body?.url

        if (!urlString || typeof urlString !== 'string' || !isValidUrl(urlString)) {
            return NextResponse.json({ error: 'Valid URL required' }, { status: 400 })
        }

        const url = new URL(urlString)
        const githubData = await tryFetchGithubRepo(url)
        if (githubData) {
            return NextResponse.json({ success: true, url: normalizeUrl(url), platform: 'github', ...githubData })
        }

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'ShipCV/1.0 (+https://shipcv.app)',
            },
        })

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 })
        }

        const html = await response.text()
        const $ = load(html)

        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').first().text().trim()

        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            ''

        const keywordsMeta = $('meta[name="keywords"]').attr('content') || ''
        const keywords = keywordsMeta
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)

        const siteName = $('meta[property="og:site_name"]').attr('content') || url.hostname

        return NextResponse.json({
            success: true,
            title: title || url.hostname,
            description,
            keywords,
            siteName,
            url: normalizeUrl(url),
            platform: detectPlatform(url)
        })
    } catch (error) {
        console.error('[Fetch URL] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 })
    }
}
