'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import PlatformSelector from '@/components/PlatformSelector'

export default function SettingsPage() {
    const { data: session } = useSession()

    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const handlePlatformToggle = (id: string) => {
        if (selectedPlatforms.includes(id)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== id))
        } else {
            setSelectedPlatforms([...selectedPlatforms, id])
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        // TODO: Implement actual save to API
        setTimeout(() => {
            setIsSaving(false)
            alert('Settings saved!')
        }, 1000)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-[var(--border-light)] pb-6">
                <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Settings</h1>
                <p className="text-[var(--text-secondary)] mt-2">Manage your connected accounts and profile preferences.</p>
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

            {/* Connected Platforms */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif font-semibold">Connected Platforms</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Manage the platforms where you showcase your work
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
            </section>
        </div>
    )
}
