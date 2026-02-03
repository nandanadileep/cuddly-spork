import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
    title: z.string().min(1),
    issuer: z.string().optional(),
    awarded_at: z.string().optional(),
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
            title: data.title,
            issuer: data.issuer,
            description: data.description,
        };
        if (data.awarded_at) payload.awarded_at = new Date(data.awarded_at);

        const newItem = await prisma.award.create({ data: payload });
        return NextResponse.json(newItem);
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

        const item = await prisma.award.findUnique({ where: { id } });
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });

        if (!item || item.user_id !== user?.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.award.delete({ where: { id } });
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

        const item = await prisma.award.findUnique({ where: { id } });
        if (!item || item.user_id !== user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const body = await req.json();
        const validation = schema.partial().safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const data = validation.data;
        const payload: any = { ...data };

        if (data.awarded_at !== undefined) {
            payload.awarded_at = data.awarded_at ? new Date(data.awarded_at) : null;
        }

        const updated = await prisma.award.update({
            where: { id },
            data: payload,
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
