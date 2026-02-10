'use client'

import { useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState('')
    const [providers, setProviders] = useState<Record<string, any> | null>(null)

    useEffect(() => {
        getProviders()
            .then((p) => setProviders(p || null))
            .catch(() => setProviders(null))
    }, [])

    const googleEnabled = Boolean(providers?.google)

    const handleGoogle = () => {
        const callbackUrl =
            typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('callbackUrl')
                : null
        signIn('google', { callbackUrl: callbackUrl || '/dashboard' })
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
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

                    {googleEnabled ? (
                        <button
                            type="button"
                            onClick={handleGoogle}
                            className="w-full px-4 py-3 rounded-lg border-2 border-[var(--border-light)] bg-white font-semibold hover:bg-[var(--bg-warm)] transition-colors flex items-center justify-center gap-3"
                        >
                            <FcGoogle className="text-xl" />
                            Continue with Google
                        </button>
                    ) : (
                        <div className="text-sm text-[var(--text-secondary)] text-center">
                            Google sign-in is not configured yet.
                        </div>
                    )}

                    <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        We only support Google sign-in right now.
                    </p>
                </div>
            </div>
        </div>
    )
}
