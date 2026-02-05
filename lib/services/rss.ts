import * as cheerio from 'cheerio'

export interface RssItem {
    title: string
    link: string
    description: string
    categories: string[]
    publishedAt?: string
}

export async function fetchRssFeed(url: string, limit = 10): Promise<RssItem[]> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.statusText}`)
    }
    const xml = await response.text()
    const $ = cheerio.load(xml, { xmlMode: true })
    const items: RssItem[] = []

    $('item').each((_, el) => {
        if (items.length >= limit) return
        const title = $(el).find('title').first().text().trim()
        const link = $(el).find('link').first().text().trim()
        const description = $(el).find('description').first().text().trim()
        const categories = $(el).find('category').map((__, c) => $(c).text().trim()).get()
        const publishedAt = $(el).find('pubDate').first().text().trim() || undefined
        if (!title || !link) return
        items.push({ title, link, description, categories, publishedAt })
    })

    return items
}
