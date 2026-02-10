'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) setError('Invalid or missing reset link.')
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Something went wrong')
                setLoading(false)
                return
            }
            setSuccess(true)
            setTimeout(() => router.push('/login'), 2000)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)] text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Link href="/forgot-password" className="text-[var(--orange-primary)] font-semibold hover:underline">
                    Request a new reset link
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)] text-center">
                <h1 className="text-2xl font-bold mb-2 text-[var(--github-green)]">Password updated</h1>
                <p className="text-[var(--text-secondary)]">Redirecting you to sign in...</p>
            </div>
        )
    }

    return (
        <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
            <h1 className="text-2xl font-bold mb-2 text-center">Set new password</h1>
            <p className="text-[var(--text-secondary)] text-sm text-center mb-6">Enter your new password below.</p>
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-2">New password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-[var(--bg-warm)] focus:border-[var(--orange-primary)] outline-none transition-colors"
                        placeholder="••••••••"
                        required
                        minLength={8}
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">At least 8 characters</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-2">Confirm password</label>
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-[var(--bg-warm)] focus:border-[var(--orange-primary)] outline-none transition-colors"
                        placeholder="••••••••"
                        required
                        minLength={8}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--orange-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Updating...' : 'Update password'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                <Link href="/login" className="text-[var(--orange-primary)] font-semibold hover:underline">
                    Back to sign in
                </Link>
            </p>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 text-center max-w-md">
                Kindly use desktop for a better experience.
            </p>
            <Suspense fallback={<div className="text-[var(--text-secondary)]">Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
