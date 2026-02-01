'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hashPassword } from '@/lib/utils'

export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Something went wrong')
            } else {
                router.push('/login?registered=true')
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
                    <h1 className="text-4xl font-extrabold mb-2">Create your account</h1>
                    <p className="text-[var(--text-secondary)]">Start building your AI-powered resume</p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-[var(--bg-warm)] focus:border-[var(--orange-primary)] outline-none transition-colors"
                                placeholder="John Doe"
                                required
                            />
                        </div>

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
                            <label className="block text-sm font-semibold mb-2">Password</label>
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--orange-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Already have an account?{' '}
                        <a href="/login" className="text-[var(--orange-primary)] font-semibold hover:underline">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
