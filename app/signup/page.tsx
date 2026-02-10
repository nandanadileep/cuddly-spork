'use client'

import { useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import ThemeToggle from '@/components/ThemeToggle'

export default function SignupPage() {
    const router = useRouter()
    const [providers, setProviders] = useState<Record<string, any> | null>(null)

    useEffect(() => {
        getProviders()
            .then((p) => setProviders(p || null))
            .catch(() => setProviders(null))
    }, [])

    const googleEnabled = Boolean(providers?.google)

    const handleGoogle = () => {
        signIn('google', { callbackUrl: '/dashboard' })
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold mb-2">Create your account</h1>
                    <p className="text-[var(--text-secondary)]">Accounts are created automatically with Google</p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)]">
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

                    <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-[var(--orange-primary)] font-semibold hover:underline"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
