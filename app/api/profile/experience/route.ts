import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
    company: z.string().min(1),
    position: z.string().min(1),
    location: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_current: z.boolean().optional(),
    description: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const body = await req.json();
        const validation = schema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: validation.error.errors }, { status: 400 });

        const data = validation.data;

        // Convert date strings to ISO-8601 Date objects if present
        const payload: any = {
            user_id: user.id,
            company: data.company,
            position: data.position,
            location: data.location,
            is_current: data.is_current || false,
            description: data.description,
        };

        if (data.start_date) payload.start_date = new Date(data.start_date);
        if (data.end_date) payload.end_date = new Date(data.end_date);

        const newExperience = await prisma.workExperience.create({
            data: payload
        });

        return NextResponse.json(newExperience);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Verify ownership
        const experience = await prisma.workExperience.findUnique({ where: { id } });
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });

        if (!experience || experience.user_id !== user?.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.workExperience.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Verify ownership
        const experience = await prisma.workExperience.findUnique({ where: { id } });
        if (!experience || experience.user_id !== user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const body = await req.json();
        const validation = schema.partial().safeParse(body);
        if (!validation.success) {
            console.log('Experience PATCH Validation Error:', validation.error.errors);
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const data = validation.data;
        const payload: any = { ...data };

        if (data.start_date !== undefined) {
            payload.start_date = data.start_date ? new Date(data.start_date) : null;
        }
        if (data.end_date !== undefined) {
            payload.end_date = data.end_date ? new Date(data.end_date) : null;
        }

        const updated = await prisma.workExperience.update({
            where: { id },
            data: payload
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
