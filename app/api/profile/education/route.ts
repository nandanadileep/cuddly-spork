import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
    institution: z.string().min(1),
    degree: z.string().min(1),
    field: z.string().optional(),
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

        const payload: any = {
            user_id: user.id,
            institution: data.institution,
            degree: data.degree,
            field: data.field,
            is_current: data.is_current || false,
            description: data.description,
        };

        if (data.start_date) payload.start_date = new Date(data.start_date);
        if (data.end_date) payload.end_date = new Date(data.end_date);

        const newEducation = await prisma.education.create({
            data: payload
        });

        return NextResponse.json(newEducation);
    } catch (error) {
        console.error(error);
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

        const edu = await prisma.education.findUnique({ where: { id } });
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });

        if (!edu || edu.user_id !== user?.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.education.delete({ where: { id } });

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

        const edu = await prisma.education.findUnique({ where: { id } });
        if (!edu || edu.user_id !== user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const body = await req.json();
        const validation = schema.partial().safeParse(body);
        if (!validation.success) {
            console.log('Education PATCH Validation Error:', validation.error.errors);
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

        const updated = await prisma.education.update({
            where: { id },
            data: payload
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
