'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PlatformSelector from '@/components/PlatformSelector'
import { getPlatformById } from '@/lib/constants/platforms'

interface Connection {
    id: string
    platform: string
    username: string
    last_synced: string | null
    metadata_jsonb: any
}

export default function SettingsPage() {
    const { data: session } = useSession()
    const router = useRouter()

    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({})
    const [connections, setConnections] = useState<Connection[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Fetch existing connections
        fetch('/api/user/connections')
            .then(res => res.json())
            .then(data => {
                if (data.connections) {
                    setConnections(data.connections)
                    // Pre-populate selected platforms and URLs
                    const connectedIds = data.connections.map((c: Connection) => c.platform)
                    const urls: Record<string, string> = {}
                    data.connections.forEach((c: Connection) => {
                        urls[c.platform] = c.metadata_jsonb?.manual_url || c.username
                    })
                    setSelectedPlatforms(connectedIds)
                    setPlatformUrls(urls)
                }
            })
            .catch(err => console.error('Failed to fetch connections:', err))
            .finally(() => setIsLoading(false))
    }, [])

    const handlePlatformToggle = (id: string) => {
        if (selectedPlatforms.includes(id)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== id))
            const newUrls = { ...platformUrls }
            delete newUrls[id]
            setPlatformUrls(newUrls)
        } else {
            setSelectedPlatforms([...selectedPlatforms, id])
        }
    }

    const handleSave = async () => {
        setIsSaving(true)

        try {
            const platforms = selectedPlatforms.map(id => ({
                id,
                url: platformUrls[id] || ''
            })).filter(p => p.url) // only include platforms with URLs

            const response = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkedinUrl: session?.user?.email, // placeholder
                    platforms
                }),
            })

            if (response.ok) {
                alert('Settings saved successfully!')
                const githubInputs = platforms.filter(p => p.id === 'github')
                if (githubInputs.length > 0) {
                    const normalizeGithubUsername = (value: string) => {
                        const trimmed = value.trim()
                        try {
                            const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
                            const url = new URL(withProtocol)
                            if (url.hostname.includes('github.com')) {
                                const parts = url.pathname.split('/').filter(Boolean)
                                if (parts[0]) return parts[0]
                            }
                        } catch {
                            // fall through
                        }
                        return trimmed.replace(/^@/, '').split('/')[0]
                    }

                    for (const gh of githubInputs) {
                        const username = normalizeGithubUsername(gh.url)
                        if (!username) continue
                        await fetch('/api/sync/github', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username })
                        })
                    }
                }
                // Refresh connections
                const data = await fetch('/api/user/connections').then(r => r.json())
                if (data.connections) {
                    setConnections(data.connections)
                }
            } else {
                alert('Failed to save settings')
            }
        } catch (error) {
            console.error('Save error:', error)
            alert('An error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-[var(--border-light)] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Settings</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Manage your connected accounts and profile preferences.</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                >
                    Back to Dashboard
                </button>
            </div>

            {/* Profile Section */}
            <section className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border-light)] shadow-sm">
                <h2 className="text-xl font-serif font-semibold mb-4">Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Display Name</label>
                        <input
                            type="text"
                            disabled
                            value={session?.user?.name || ''}
                            className="w-full px-4 py-2 rounded-md bg-[var(--bg-warm)] border-transparent text-[var(--text-secondary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
                        <input
                            type="email"
                            disabled
                            value={session?.user?.email || ''}
                            className="w-full px-4 py-2 rounded-md bg-[var(--bg-warm)] border-transparent text-[var(--text-secondary)]"
                        />
                    </div>
                </div>
            </section>

            {/* Connected Platforms Summary */}
            {connections.length > 0 && (
                <section className="bg-[var(--green-light)] rounded-lg p-6 border border-[var(--github-green)]">
                    <h3 className="font-serif font-semibold text-lg mb-3 flex items-center gap-2">
                            <span>Connected Platforms ({connections.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {connections.map(conn => (
                        <ConnectionCard
                            key={conn.id}
                            connection={conn}
                            onSyncComplete={() => {
                                    // Refresh connections
                                    fetch('/api/user/connections')
                                        .then(r => r.json())
                                        .then(data => {
                                            if (data.connections) {
                                                setConnections(data.connections)
                                            }
                                        })
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Manage Platforms */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif font-semibold">Manage Platforms</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Add or update the platforms where you showcase your work
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <PlatformSelector
                    selectedPlatforms={selectedPlatforms}
                    onPlatformToggle={handlePlatformToggle}
                />

                {/* URL Inputs for Selected Platforms */}
                {selectedPlatforms.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="font-semibold text-lg">Platform URLs</h3>
                        {selectedPlatforms.map(id => {
                            const platform = getPlatformById(id)
                            if (!platform) return null

                            return (
                                <div key={id} className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-light)] bg-white">
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--bg-light)] rounded-md">
                                        <platform.icon className="text-xl" style={{ color: platform.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1 block">
                                            {platform.name}
                                        </label>
                                        <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                                            Fetches: {platform.fetches.join(', ')}
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="Your profile URL or username"
                                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 font-medium"
                                            value={platformUrls[id] || ''}
                                            onChange={(e) => setPlatformUrls({ ...platformUrls, [id]: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}

function ConnectionCard({ connection, onSyncComplete }: { connection: Connection, onSyncComplete: () => void }) {
    const platform = getPlatformById(connection.platform)
    const [syncing, setSyncing] = useState(false)

    if (!platform) return null

    const handleSync = async () => {
        setSyncing(true)
        try {
            if (connection.platform === 'github') {
                const response = await fetch('/api/sync/github', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: connection.metadata_jsonb?.manual_url || connection.username })
                })

                if (response.ok) {
                    const result = await response.json()
                    alert(`Synced ${result.stats?.total || 0} repositories!`)
                    onSyncComplete()
                } else {
                    alert('Sync failed')
                }
            } else {
                alert('Sync not implemented for this platform yet')
            }
        } catch (error) {
            console.error('Sync error:', error)
            alert('Sync failed')
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="flex items-center gap-3 bg-white rounded-md p-3">
            <platform.icon className="text-xl flex-shrink-0" style={{ color: platform.color }} />
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{platform.name}</div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                    {connection.metadata_jsonb?.manual_url || connection.username}
                </div>
            </div>
            <button
                onClick={handleSync}
                disabled={syncing}
                className="px-3 py-1 text-xs bg-[var(--orange-primary)] text-white rounded font-medium hover:bg-[var(--orange-hover)] transition-colors disabled:opacity-50"
            >
                {syncing ? 'Syncing...' : 'Sync'}
            </button>
        </div>
    )
}
