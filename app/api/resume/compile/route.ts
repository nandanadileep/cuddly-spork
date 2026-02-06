import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const parseLatexLiteError = (raw: string) => {
    let details = String(raw || '').trim()
    try {
        const parsed = JSON.parse(details)
        const maybe = parsed?.error?.message || parsed?.message || details
        details = String(maybe || '').trim()
    } catch {
        // keep raw
    }
    details = details.replace(/\s+/g, ' ').trim()

    let hint = ''
    if (/missing\\s*\\\\item|perhaps a missing\s*\\\\item/i.test(details)) {
        hint = 'Tip: this usually happens when a section has no bullet points. Add a bullet (or remove the empty section) and try again.'
    } else if (/undefined control sequence/i.test(details)) {
        hint = 'Tip: remove backslashes or LaTeX commands from your text and try again.'
    } else if (/runaway argument|file ended while scanning|extra \\}|missing \\}|missing \\{/i.test(details)) {
        hint = 'Tip: remove unmatched braces like { or } from your text and try again.'
    }

    return { details, hint }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const latex = body?.latex

        if (!latex || typeof latex !== 'string') {
            return NextResponse.json({ error: 'LaTeX content is required' }, { status: 400 })
        }

        const apiKey = process.env.LATEXLITE_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'LATEXLITE_API_KEY is not configured' }, { status: 500 })
        }

        const latexResponse = await fetch('https://latexlite.com/v1/renders-sync', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                template: latex,
                data: {},
            }),
        })

        if (!latexResponse.ok) {
            const errorText = await latexResponse.text()
            console.error('[Resume Compile] LaTeXLite error:', errorText)
            const { details, hint } = parseLatexLiteError(errorText)
            return NextResponse.json({ error: 'LaTeX compilation failed', details, hint }, { status: 502 })
        }

        const pdfBuffer = Buffer.from(await latexResponse.arrayBuffer())

        return NextResponse.json({
            success: true,
            pdfBase64: pdfBuffer.toString('base64'),
        })
    } catch (error) {
        console.error('[Resume Compile] Error:', error)
        return NextResponse.json({ error: 'Failed to compile LaTeX' }, { status: 500 })
    }
}
