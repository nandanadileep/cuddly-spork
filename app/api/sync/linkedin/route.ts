import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { url } = await req.json()
        if (!url) {
            return NextResponse.json({ error: 'Missing LinkedIn URL' }, { status: 400 })
        }

        // Save the URL first
        await prisma.user.update({
            where: { id: session.user.id },
            data: { linkedin_url: url }
        })

        // NOTE: This is a placeholder for actual scraping logic.
        // Direct LinkedIn scraping is difficult without proxies/paid APIs.
        // For now, we return a mock success response so the UI can proceed 
        // to manual entry or show a "best effort" empty form.

        return NextResponse.json({
            success: true,
            extracted: {
                // Return empty or mock data for now
                education: [],
                experience: []
            }
        })
    } catch (error) {
        console.error('LinkedIn sync error:', error)
        return NextResponse.json(
            { error: 'Failed to sync LinkedIn profile' },
            { status: 500 }
        )
    }
}
