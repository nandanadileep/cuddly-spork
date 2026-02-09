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

        const { firstName, middleName, lastName, linkedinUrl, websiteUrl, phone, location } = await req.json()

        // Validation (basic)
        if (linkedinUrl && !linkedinUrl.includes('linkedin.com/in/')) {
            return NextResponse.json(
                { error: 'Invalid LinkedIn URL. Must contain linkedin.com/in/' },
                { status: 400 }
            )
        }

        const normalizeUrlOrNull = (value: unknown) => {
            if (typeof value !== 'string') return undefined
            const trimmed = value.trim()
            if (!trimmed) return null
            try {
                const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
                    ? trimmed
                    : `https://${trimmed}`
                return new URL(normalized).toString()
            } catch {
                return undefined
            }
        }

        const nextWebsite = normalizeUrlOrNull(websiteUrl)
        if (websiteUrl && nextWebsite === undefined) {
            return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 })
        }

        // Update user
        const nameParts = [firstName, middleName, lastName]
            .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
        const fullName = nameParts.join(' ')

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(fullName ? { name: fullName } : {}),
                linkedin_url: linkedinUrl || null,
                website: nextWebsite,
                phone: typeof phone === 'string' ? phone.trim() || null : undefined,
                location: typeof location === 'string' ? location.trim() || null : undefined,
            },
        })

        return NextResponse.json({
            success: true,
            user: {
                linkedinUrl: user.linkedin_url,
                websiteUrl: user.website,
                phone: user.phone,
                location: user.location,
                name: user.name,
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
                website: true,
                phone: true,
                location: true,
                name: true,
                email: true,
                onboarding_completed: true
            }
        })

        return NextResponse.json({
            user: {
                linkedinUrl: user?.linkedin_url,
                websiteUrl: user?.website,
                phone: user?.phone,
                location: user?.location,
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
