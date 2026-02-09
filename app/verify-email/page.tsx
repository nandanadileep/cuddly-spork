'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'missing'>('idle')
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (!token) {
            setStatus('missing')
            setMessage('Missing verification token.')
            return
        }

        const verify = async () => {
            try {
                const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
                const data = await res.json().catch(() => ({}))
                if (res.ok) {
                    setStatus('success')
                    setMessage('Email verified successfully.')
                } else {
                    setStatus('error')
                    setMessage(data.error || 'Verification link is invalid or expired.')
                }
            } catch (error) {
                setStatus('error')
                setMessage('Verification failed. Please try again.')
            }
        }

        verify()
    }, [token])

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl p-8 shadow-lg border border-[var(--border-light)] text-center space-y-4">
                <h1 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Verify Email</h1>
                <p className="text-sm text-[var(--text-secondary)]">{message || 'Verifying your email...'}</p>
                {status === 'success' && (
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                    >
                        Continue to login
                    </Link>
                )}
                {status !== 'success' && (
                    <Link href="/login" className="text-sm text-[var(--orange-primary)] font-semibold hover:underline">
                        Back to login
                    </Link>
                )}
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Verifying...</div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
