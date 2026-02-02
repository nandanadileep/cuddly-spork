'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setStatus('sending')

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            if (response.ok) {
                setStatus('sent')
            } else {
                setStatus('error')
            }
        } catch (error) {
            console.error('Forgot password error:', error)
            setStatus('error')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold mb-2">Reset your password</h1>
                    <p className="text-[var(--text-secondary)]">
                        Enter your email and we&apos;ll send a reset link.
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                        Kindly use desktop for a better experience.
                    </p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
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
                            disabled={status === 'sending'}
                            className="w-full bg-[var(--orange-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'sending' ? 'Sending...' : 'Send reset link'}
                        </button>
                    </form>

                    {status === 'sent' && (
                        <p className="text-sm text-[var(--github-green)] mt-4">
                            Reset link sent. Please check your email.
                        </p>
                    )}
                    {status === 'error' && (
                        <p className="text-sm text-red-500 mt-4">
                            Something went wrong. Please try again.
                        </p>
                    )}

                    <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Remembered your password?{' '}
                        <a href="/login" className="text-[var(--orange-primary)] font-semibold hover:underline">
                            Back to sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
