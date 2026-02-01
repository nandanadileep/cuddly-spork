'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session } = useSession()
    const pathname = usePathname()

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊' },
        { name: 'Platforms', href: '/platforms', icon: '🔗' },
        { name: 'Projects', href: '/projects', icon: '📦' },
        { name: 'Resumes', href: '/resumes', icon: '📄' },
    ]

    return (
        <div className="min-h-screen bg-[var(--bg-light)]">
            {/* Navigation Bar */}
            <nav className="bg-[var(--bg-card)] border-b border-[var(--border-light)] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <span className="text-2xl">📄</span>
                            <span className="text-xl font-extrabold">GitHire</span>
                        </Link>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center gap-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${isActive
                                                ? 'bg-[var(--orange-light)] text-[var(--orange-primary)]'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]'
                                            }`}
                                    >
                                        <span className="mr-2">{item.icon}</span>
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                <div className="font-semibold">{session?.user?.name || 'User'}</div>
                                <div className="text-[var(--text-secondary)] text-xs">{session?.user?.email}</div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="px-4 py-2 rounded-lg border-2 border-[var(--border-light)] hover:border-[var(--orange-primary)] transition-all text-sm font-medium"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
