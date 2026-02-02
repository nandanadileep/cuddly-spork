import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/utils'

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json()

        // Validate input
        if (!email || !password) {
            console.log('Signup failed: Missing email or password');
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            console.log('Signup failed: Password too short');
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            )
        }

        // Hash password
        const password_hash = await hashPassword(password)

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            },
        })

        return NextResponse.json({
            success: true,
            user,
        })
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'An error occurred during signup' },
            { status: 500 }
        )
    }
}
