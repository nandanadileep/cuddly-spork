import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    // On platforms like Vercel we always want secure cookies in production.
    // This also keeps cookie names stable even if NEXTAUTH_URL is misconfigured.
    useSecureCookies: process.env.NODE_ENV === 'production',
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                }),
            ]
            : []),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google' && user.email) {
                try {
                    const normalizedEmail = user.email.trim().toLowerCase()
                    const existingUser = await prisma.user.findFirst({
                        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
                        select: { id: true, email_verified_at: true },
                    })

                    if (!existingUser) {
                        await prisma.user.create({
                            data: {
                                email: normalizedEmail,
                                name: user.name || profile?.name || 'Google User',
                                openai_credits: 20,
                                email_verified_at: new Date(),
                            },
                        })
                    } else if (!existingUser.email_verified_at) {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { email_verified_at: new Date() },
                        })
                    }
                } catch (error) {
                    console.error('Error creating user:', error);
                    return false;
                }
            }
            return true;
        },
        async session({ session, token, user }) {
            if (session?.user) {
                session.user.id = token.sub || user?.id || '';
                session.user.targetRole = (token as any).targetRole || null;
                session.user.email = (token.email as string) || session.user.email;
            }
            return session;
        },
        async jwt({ token, user, account, profile, trigger, session }) {
            if (user && token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                    select: { id: true, target_role: true },
                });
                if (dbUser) {
                    token.sub = dbUser.id;
                    (token as any).targetRole = dbUser.target_role || null;
                }
            }

            if (trigger === 'update' && session) {
                if (token.sub) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { email: true, target_role: true },
                    })
                    if (dbUser) {
                        token.email = dbUser.email;
                        (token as any).targetRole = dbUser.target_role ?? (token as any).targetRole ?? null
                    }
                } else {
                    (token as any).targetRole = (session as any).targetRole ?? (token as any).targetRole ?? null;
                }
            }

            // Store GitHub access token if OAuth login
            return token;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    debug: true,
};
