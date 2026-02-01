'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PlatformsPage() {
    const [connecting, setConnecting] = useState<string | null>(null)
    const [syncing, setSyncing] = useState<string | null>(null)

    const { data, error, mutate } = useSWR('/api/platforms', fetcher)

    const platforms = [
        {
            id: 'github',
            name: 'GitHub',
            description: 'Import repositories and contributions',
            icon: '🐙',
            color: 'black',
            available: true,
        },
        {
            id: 'gitlab',
            name: 'GitLab',
            description: 'Sync your GitLab projects',
            icon: '🦊',
            color: '#FC6D26',
            available: false,
        },
        {
            id: 'behance',
            name: 'Behance',
            description: 'Import design portfolios',
            icon: '🎨',
            color: '#1769FF',
            available: false,
        },
        {
            id: 'dribbble',
            name: 'Dribbble',
            description: 'Showcase your design work',
            icon: '🏀',
            color: '#EA4C89',
            available: false,
        },
        {
            id: 'codepen',
            name: 'CodePen',
            description: 'Import your frontend demos',
            icon: '✏️',
            color: '#000000',
            available: false,
        },
        {
            id: 'medium',
            name: 'Medium',
            description: 'Add your technical articles',
            icon: '📝',
            color: '#000000',
            available: false,
        },
    ]

    const connectedPlatforms = data?.connections || []
    const isConnected = (platformId: string) =>
        connectedPlatforms.some((c: any) => c.platform === platformId)

    const handleConnect = async (platformId: string) => {
        setConnecting(platformId)

        if (platformId === 'github') {
            await signIn('github', { callbackUrl: '/platforms?connected=github' })
        } else {
            alert(`${platformId} integration coming soon!`)
            setConnecting(null)
        }
    }

    const handleSync = async (platformId: string) => {
        setSyncing(platformId)

        try {
            const response = await fetch('/api/platforms/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: platformId }),
            })

            const result = await response.json()

            if (response.ok) {
                alert(`✅ ${result.message}`)
                mutate()
            } else {
                alert(`❌ ${result.error}`)
            }
        } catch (error) {
            alert('Failed to sync platform')
        } finally {
            setSyncing(null)
        }
    }

    const handleDisconnect = async (platformId: string) => {
        if (!confirm(`Disconnect ${platformId}? This will not delete your imported projects.`)) {
            return
        }

        try {
            const response = await fetch(`/api/platforms?platform=${platformId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                alert('Platform disconnected')
                mutate()
            } else {
                alert('Failed to disconnect platform')
            }
        } catch (error) {
            alert('Failed to disconnect platform')
        }
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold mb-2">Connect Platforms</h1>
                <p className="text-lg text-[var(--text-secondary)]">
                    Link your accounts to automatically import your projects
                </p>
            </div>

            {/* Connected Platforms */}
            <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Connected ({connectedPlatforms.length})</h2>
                {connectedPlatforms.length === 0 ? (
                    <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border-light)] text-center">
                        <div className="text-6xl mb-4">🔗</div>
                        <p className="text-[var(--text-secondary)]">
                            No platforms connected yet. Connect your first platform below!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {connectedPlatforms.map((connection: any) => {
                            const platform = platforms.find(p => p.id === connection.platform)
                            if (!platform) return null

                            return (
                                <div
                                    key={connection.id}
                                    className="bg-[var(--bg-card)] rounded-xl p-6 border-2 border-[var(--github-green)]"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">{platform.icon}</div>
                                            <div>
                                                <h3 className="font-bold">{platform.name}</h3>
                                                {connection.username && (
                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                        @{connection.username}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-[var(--github-green)] text-white text-xs font-semibold rounded-full">
                                            Connected
                                        </span>
                                    </div>

                                    {connection.last_synced && (
                                        <p className="text-xs text-[var(--text-secondary)] mb-4">
                                            Last synced: {new Date(connection.last_synced).toLocaleString()}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSync(connection.platform)}
                                            disabled={syncing === connection.platform}
                                            className="flex-1 py-2 px-4 bg-[var(--orange-primary)] text-white rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50"
                                        >
                                            {syncing === connection.platform ? 'Syncing...' : '🔄 Sync Now'}
                                        </button>
                                        <button
                                            onClick={() => handleDisconnect(connection.platform)}
                                            className="py-2 px-4 border-2 border-[var(--border-light)] rounded-lg font-semibold hover:border-red-500 hover:text-red-500 transition-all"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Available Platforms */}
            <div>
                <h2 className="text-xl font-bold mb-4">Available Platforms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {platforms.filter(p => !isConnected(p.id)).map((platform) => (
                        <div
                            key={platform.id}
                            className="bg-[var(--bg-card)] rounded-2xl p-6 border-2 border-[var(--border-light)] hover:border-[var(--orange-primary)] transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{platform.icon}</div>
                                {platform.available && (
                                    <span className="px-3 py-1 bg-[var(--github-green)] text-white text-xs font-semibold rounded-full">
                                        Available
                                    </span>
                                )}
                                {!platform.available && (
                                    <span className="px-3 py-1 bg-[var(--text-secondary)] text-white text-xs font-semibold rounded-full">
                                        Coming Soon
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold mb-2">{platform.name}</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                {platform.description}
                            </p>

                            <button
                                onClick={() => handleConnect(platform.id)}
                                disabled={!platform.available || connecting === platform.id}
                                className={`w-full py-3 rounded-lg font-semibold transition-all ${platform.available
                                        ? 'bg-[var(--orange-primary)] text-white hover:bg-[var(--orange-hover)] hover:scale-105'
                                        : 'bg-[var(--bg-warm)] text-[var(--text-secondary)] cursor-not-allowed'
                                    }`}
                            >
                                {connecting === platform.id ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-[var(--orange-light)] rounded-2xl p-6 border border-[var(--orange-primary)]">
                <h3 className="font-bold mb-2">🔒 Your data is secure</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                    We only request read-only access to your public repositories and projects.
                    Your credentials are encrypted and never shared with third parties.
                </p>
            </div>
        </div>
    )
}
