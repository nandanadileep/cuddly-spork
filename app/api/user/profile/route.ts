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

        const { linkedinUrl } = await req.json()

        // Validation (basic)
        if (linkedinUrl && !linkedinUrl.includes('linkedin.com/in/')) {
            return NextResponse.json(
                { error: 'Invalid LinkedIn URL. Must contain linkedin.com/in/' },
                { status: 400 }
            )
        }

        // Update user
        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                linkedin_url: linkedinUrl || null,
            },
        })

        return NextResponse.json({
            success: true,
            user: {
                linkedinUrl: user.linkedin_url,
            },
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                linkedin_url: true,
                name: true,
                email: true,
                onboarding_completed: true
            }
        })

        return NextResponse.json({
            user: {
                linkedinUrl: user?.linkedin_url,
                name: user?.name,
                email: user?.email,
                onboardingCompleted: user?.onboarding_completed
            }
        })
    } catch (error) {
        console.error('Profile fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
