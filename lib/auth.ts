import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/utils';

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'read:user user:email repo',
                },
            },
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    });

                    if (!user || !user.password_hash) {
                        console.log('User not found or no password hash for:', credentials.email);
                        return null;
                    }

                    const isValid = await verifyPassword(credentials.password, user.password_hash);
                    console.log('Login attempt for:', credentials.email, 'Valid:', isValid);

                    if (!isValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        email: user.email!,
                        name: user.name || '',
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // For OAuth providers, ensure user exists in database
            if (account?.provider === 'github' && user.email) {
                try {
                    // Check if user exists
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email },
                    });

                    if (!existingUser) {
                        // Create user in database
                        await prisma.user.create({
                            data: {
                                id: user.id,
                                email: user.email,
                                name: user.name || profile?.name || 'GitHub User',
                                openai_credits: 20, // Give new users 20 credits (2 free analyses)
                            },
                        });
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
            }
            return session;
        },
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.id = user.id;
            }

            // Store GitHub access token if OAuth login
            if (account?.provider === 'github' && account?.access_token && token?.sub) {
                try {
                    // Ensure user exists in database first
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email! },
                    });

                    if (dbUser) {
                        await prisma.platformConnection.upsert({
                            where: {
                                user_id_platform: {
                                    user_id: dbUser.id,
                                    platform: 'github',
                                },
                            },
                            create: {
                                user_id: dbUser.id,
                                platform: 'github',
                                access_token_encrypted: account.access_token,
                                username: account.providerAccountId || (profile as any)?.login || '',
                            },
                            update: {
                                access_token_encrypted: account.access_token,
                                username: account.providerAccountId || (profile as any)?.login || '',
                                last_synced: new Date(),
                            },
                        });
                    }
                } catch (error) {
                    console.error('Error saving platform connection:', error);
                }
            }

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
    secret: process.env.NEXTAUTH_SECRET,
    debug: true,
};
