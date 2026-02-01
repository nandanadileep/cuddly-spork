'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        // Redirect to onboarding if not completed
        if (status === 'authenticated' && session?.user) {
            fetch('/api/user/profile')
                .then(res => res.json())
                .then(data => {
                    if (!data.onboarding_completed) {
                        router.push('/onboarding')
                    }
                })
        }
    }, [session, status, router])

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-2xl font-serif text-[var(--text-secondary)]">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">
                    Welcome back, {session?.user?.name}!
                </h1>
                <p className="text-[var(--text-secondary)] text-lg">
                    Your profile is being synced from your connected platforms.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border-light)] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--green-light)] flex items-center justify-center">
                            <span className="text-2xl">✓</span>
                        </div>
                        <div>
                            <h3 className="font-serif font-semibold text-lg">Onboarding Complete</h3>
                            <p className="text-sm text-[var(--text-secondary)]">You're all set up</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border-light)] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--orange-light)] flex items-center justify-center">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                            <h3 className="font-serif font-semibold text-lg">Manage Platforms</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Update your connections</p>
                        </div>
                    </div>
                    <a
                        href="/settings"
                        className="inline-block px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-colors text-sm"
                    >
                        Go to Settings
                    </a>
                </div>
            </div>

            <div className="mt-8 bg-[var(--bg-warm)] rounded-lg p-8 border border-[var(--border-light)]">
                <h2 className="text-2xl font-serif font-semibold mb-4">What's Next?</h2>
                <div className="space-y-3 text-[var(--text-secondary)]">
                    <p>🔄 Your platform data will be synced automatically</p>
                    <p>📊 View and manage your connected platforms in Settings</p>
                    <p>🎯 More features coming soon...</p>
                </div>
            </div>
        </div>
    )
}
