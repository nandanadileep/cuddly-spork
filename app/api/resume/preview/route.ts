import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id || null
        const userEmail = session.user.email || null

        const user = userId
            ? await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    location: true,
                    website: true,
                    linkedin_url: true,
                    target_role: true,
                },
            })
            : userEmail
                ? await prisma.user.findUnique({
                    where: { email: userEmail },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        location: true,
                        website: true,
                        linkedin_url: true,
                        target_role: true,
                    },
                })
                : null

        if (!user?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const [education, experience, extracurriculars, awards, publications, connections] = await Promise.all([
            prisma.education.count({ where: { user_id: user.id } }),
            prisma.workExperience.count({ where: { user_id: user.id } }),
            prisma.extracurricular.count({ where: { user_id: user.id } }),
            prisma.award.count({ where: { user_id: user.id } }),
            prisma.publication.count({ where: { user_id: user.id } }),
            prisma.platformConnection.findMany({
                where: { user_id: user.id, platform: { in: ['github'] } },
                select: { platform: true, username: true, metadata_jsonb: true },
            }),
        ])

        const githubConnection = connections.find((item) => item.platform === 'github')
        const githubUrl = githubConnection?.username
            ? `https://github.com/${githubConnection.username}`
            : (githubConnection?.metadata_jsonb as { manual_url?: string } | null | undefined)?.manual_url ?? null

        return NextResponse.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location,
                website: user.website,
                linkedinUrl: user.linkedin_url,
                targetRole: user.target_role,
            },
            counts: {
                education,
                experience,
                extracurriculars,
                awards,
                publications,
            },
            links: {
                githubUrl,
            },
        })
    } catch (error) {
        console.error('[Resume Preview] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch resume preview' }, { status: 500 })
    }
}

