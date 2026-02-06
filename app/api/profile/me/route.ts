import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            // Never return sensitive user fields (password_hash, reset tokens, etc) to the client.
            select: {
                id: true,
                email: true,
                name: true,
                linkedin_url: true,
                website: true,
                phone: true,
                location: true,
                target_role: true,
                onboarding_completed: true,
                job_description_jsonb: true,
                education: {
                    orderBy: { start_date: 'desc' },
                },
                workExperience: {
                    orderBy: { start_date: 'desc' },
                },
                extracurriculars: {
                    orderBy: { start_date: 'desc' },
                },
                awards: {
                    orderBy: { awarded_at: 'desc' },
                },
                publications: {
                    orderBy: { published_at: 'desc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
