'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Something went wrong')
                setLoading(false)
                return
            }
            setSent(true)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
                <div className="fixed top-4 right-4 z-40">
                    <ThemeToggle />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4 text-center max-w-md">
                    Kindly use desktop for a better experience.
                </p>
                <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)] text-center">
                    <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                    <p className="text-[var(--text-secondary)] mb-6">
                        If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
                    </p>
                    <Link
                        href="/login"
                        className="text-[var(--orange-primary)] font-semibold hover:underline"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 text-center max-w-md">
                Kindly use desktop for a better experience.
            </p>
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold mb-2">Forgot password?</h1>
                    <p className="text-[var(--text-secondary)]">Enter your email and we&apos;ll send you a reset link.</p>
                </div>
                <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-[var(--bg-warm)] focus:border-[var(--orange-primary)] outline-none transition-colors"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--orange-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send reset link'}
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        <Link href="/login" className="text-[var(--orange-primary)] font-semibold hover:underline">
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
