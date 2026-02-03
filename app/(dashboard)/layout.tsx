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
    ]

    return (
        <div className="min-h-screen bg-[var(--bg-light)]">
            {/* Navigation Bar */}
            <nav className="bg-[var(--bg-card)] border-b border-[var(--border-light)] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-12">
                            <Link href="/dashboard" className="flex items-center gap-2 group">
                                <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
                                <span className="text-xl font-serif font-bold tracking-tight text-[var(--text-primary)]">ShipCV</span>
                            </Link>

                            {/* Navigation Links */}
                            <div className="hidden md:flex items-center gap-6">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                                ? 'text-[var(--orange-primary)]'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                }`}
                                        >
                                            <span className={`text-lg ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.icon}</span>
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-6">
                            <Link
                                href="/profile"
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname === '/profile'
                                    ? 'text-[var(--orange-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <span className={`text-lg ${pathname === '/profile' ? 'opacity-100' : 'opacity-70'}`}>👤</span>
                                Profile
                            </Link>

                            <Link
                                href="/settings"
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname === '/settings'
                                    ? 'text-[var(--orange-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <span className={`text-lg ${pathname === '/settings' ? 'opacity-100' : 'opacity-70'}`}>⚙️</span>
                                Settings
                            </Link>

                            <div className="h-6 w-px bg-[var(--border-light)]" />

                            <div className="flex items-center gap-4">
                                <div className="text-sm text-right hidden sm:block">
                                    <div className="font-medium text-[var(--text-primary)]">{session?.user?.name || 'User'}</div>
                                    <div className="text-[var(--text-secondary)] text-xs">{session?.user?.email}</div>
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="px-4 py-2 rounded-md border border-[var(--border-light)] hover:bg-[var(--bg-warm)] transition-colors text-sm font-medium text-[var(--text-secondary)]"
                                >
                                    Sign Out
                                </button>
                            </div>
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
