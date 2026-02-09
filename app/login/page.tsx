'use client'

import { useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [resendMessage, setResendMessage] = useState('')
    const [isResending, setIsResending] = useState(false)
    const [loading, setLoading] = useState(false)
    const [providers, setProviders] = useState<Record<string, any> | null>(null)

    useEffect(() => {
        getProviders()
            .then((p) => setProviders(p || null))
            .catch(() => setProviders(null))
    }, [])

    const googleEnabled = Boolean(providers?.google)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                if (result.error === 'EMAIL_NOT_VERIFIED') {
                    setError('Please verify your email before signing in.')
                } else {
                    setError('Invalid email or password')
                }
            } else {
                // Avoid useSearchParams() so /login can be prerendered in production builds.
                const callbackUrl =
                    typeof window !== 'undefined'
                        ? new URLSearchParams(window.location.search).get('callbackUrl')
                        : null
                router.push(callbackUrl || '/dashboard')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleResendVerification = async () => {
        if (!email) {
            setResendMessage('Enter your email above to resend the verification link.')
            return
        }
        setIsResending(true)
        setResendMessage('')
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                if (data.alreadyVerified) {
                    setResendMessage('Email already verified. Please sign in.')
                } else {
                    setResendMessage('If an account exists, we sent a verification link.')
                }
            } else {
                setResendMessage(data.error || 'Failed to resend verification email.')
            }
        } catch (err) {
            setResendMessage('Failed to resend verification email.')
        } finally {
            setIsResending(false)
        }
    }

    const handleGoogle = () => {
        const callbackUrl =
            typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('callbackUrl')
                : null
        signIn('google', { callbackUrl: callbackUrl || '/dashboard' })
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold mb-2">Welcome back</h1>
                    <p className="text-[var(--text-secondary)]">Sign in to your ShipCV account</p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {resendMessage && (
                        <div className="mb-4 p-3 bg-[var(--bg-warm)] border border-[var(--border-light)] text-[var(--text-secondary)] rounded-lg text-sm">
                            {resendMessage}
                        </div>
                    )}

                    {googleEnabled && (
                        <>
                            <button
                                type="button"
                                onClick={handleGoogle}
                                className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-white font-semibold hover:bg-[var(--bg-warm)] transition-colors flex items-center justify-center gap-3"
                            >
                                <FcGoogle className="text-xl" />
                                Continue with Google
                            </button>
                            <div className="relative my-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--border-light)]" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)]">
                                        or
                                    </span>
                                </div>
                            </div>
                        </>
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

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold">Password</label>
                                <a
                                    href="/forgot-password"
                                    className="text-sm text-[var(--orange-primary)] font-semibold hover:underline"
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-[var(--bg-warm)] focus:border-[var(--orange-primary)] outline-none transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--orange-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {error === 'Please verify your email before signing in.' && (
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={isResending}
                            className="mt-4 w-full px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                        >
                            {isResending ? 'Sending...' : 'Resend verification email'}
                        </button>
                    )}

                    <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Don't have an account?{' '}
                        <a href="/signup" className="text-[var(--orange-primary)] font-semibold hover:underline">
                            Sign up
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
