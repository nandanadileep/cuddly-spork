import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
            return NextResponse.json({ error: 'LaTeX compilation failed' }, { status: 502 })
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
