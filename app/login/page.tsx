'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

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
                setError('Invalid email or password')
            } else {
                router.push('/dashboard')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
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
