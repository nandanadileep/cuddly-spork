import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch user's profile (education + experience)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const education = await prisma.education.findMany({
            where: { user_id: session.user.id },
            orderBy: { start_date: 'desc' }
        })

        const experience = await prisma.workExperience.findMany({
            where: { user_id: session.user.id },
            orderBy: { start_date: 'desc' }
        })

        return NextResponse.json({ education, experience })
    } catch (error) {
        console.error('Fetch profile error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

// POST: Add or Update profile item
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { type, data } = body

        if (type === 'education') {
            const result = await prisma.education.create({
                data: {
                    user_id: session.user.id,
                    institution: data.institution,
                    degree: data.degree,
                    field: data.field,
                    start_date: data.startDate ? new Date(data.startDate) : null,
                    end_date: data.endDate ? new Date(data.endDate) : null,
                    is_current: data.current || false,
                    description: data.description
                }
            })
            return NextResponse.json(result)
        }

        if (type === 'experience') {
            const result = await prisma.workExperience.create({
                data: {
                    user_id: session.user.id,
                    company: data.company,
                    position: data.position,
                    location: data.location,
                    start_date: data.startDate ? new Date(data.startDate) : null,
                    end_date: data.endDate ? new Date(data.endDate) : null,
                    is_current: data.current || false,
                    description: data.description
                }
            })
            return NextResponse.json(result)
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}

// DELETE: Remove item
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const type = searchParams.get('type')

        if (!id || !type) {
            return NextResponse.json({ error: 'Missing id or type' }, { status: 400 })
        }

        if (type === 'education') {
            await prisma.education.delete({
                where: { id, user_id: session.user.id }
            })
        } else if (type === 'experience') {
            await prisma.workExperience.delete({
                where: { id, user_id: session.user.id }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete profile item error:', error)
        return NextResponse.json(
            { error: 'Failed to delete item' },
            { status: 500 }
        )
    }
}
