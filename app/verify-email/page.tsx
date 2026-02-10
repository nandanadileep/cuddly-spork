'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)] text-center space-y-4">
                <h1 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Email verification</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                    Email verification is handled by Google sign-in. Please continue with Google.
                </p>
                <Link href="/login" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-sm font-semibold hover:bg-[var(--orange-hover)]">
                    Go to sign in
                </Link>
            </div>
        </div>
    )
}
