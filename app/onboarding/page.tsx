'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SiLinkedin } from 'react-icons/si'
import { MdCheckCircle, MdSync } from 'react-icons/md'
import PlatformSelector from '@/components/PlatformSelector'
import { getPlatformById } from '@/lib/constants/platforms'

export default function OnboardingPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [targetRole, setTargetRole] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({})

    // Syncing state
    const [syncProgress, setSyncProgress] = useState<Record<string, 'pending' | 'syncing' | 'complete'>>({})
    const [isSyncing, setIsSyncing] = useState(false)

    const handleNext = () => setStep(step + 1)
    const handleBack = () => setStep(step - 1)

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

    const startSync = async () => {
        setIsSyncing(true)

        // Initialize progress tracking
        const initialProgress: Record<string, 'pending' | 'syncing' | 'complete'> = {}
        if (linkedinUrl) initialProgress['linkedin'] = 'pending'
        selectedPlatforms.forEach(id => {
            initialProgress[id] = 'pending'
        })
        setSyncProgress(initialProgress)

        // Actually sync each platform
        const platformsToSync = linkedinUrl ? ['linkedin', ...selectedPlatforms] : selectedPlatforms

        for (const platformId of platformsToSync) {
            setSyncProgress(prev => ({ ...prev, [platformId]: 'syncing' }))

            try {
                if (platformId === 'github') {
                    // Actually fetch GitHub repos
                    const username = platformUrls[platformId]
                    if (username) {
                        const response = await fetch('/api/sync/github', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username })
                        })

                        if (!response.ok) {
                            console.error('GitHub sync failed:', await response.text())
                        }
                    }
                } else {
                    // For other platforms, just wait (not implemented yet)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }

                setSyncProgress(prev => ({ ...prev, [platformId]: 'complete' }))
            } catch (error) {
                console.error(`Sync failed for ${platformId}:`, error)
                setSyncProgress(prev => ({ ...prev, [platformId]: 'complete' }))
            }
        }

        setIsSyncing(false)

        // Wait a moment to show completion, then redirect
        setTimeout(() => {
            router.push('/dashboard')
        }, 1000)
    }


    const handleContinueToSync = async () => {
        setIsLoading(true)
        try {
            // Save URLs to backend
            const response = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkedinUrl,
                    targetRole,
                    platforms: selectedPlatforms.map(id => ({
                        id,
                        url: platformUrls[id]
                    }))
                }),
            })

            if (response.ok) {
                handleNext() // Go to step 4 (sync)
                // Start syncing immediately
                setTimeout(() => startSync(), 500)
            } else {
                alert('Something went wrong. Please try again.')
            }
        } catch (error) {
            console.error('Onboarding error:', error)
            alert('Failed to save details')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-light)] p-4">
            <div className="bg-[var(--bg-card)] max-w-3xl w-full rounded-lg shadow-sm border border-[var(--border-light)] p-8 my-8">

                {/* Progress */}
                <div className="flex justify-between items-end mb-8 border-b border-[var(--border-light)] pb-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Welcome to ShipCV</h1>
                        <p className="text-[var(--text-secondary)] mt-1 font-sans">
                            {step === 5 ? 'Setting up your profile...' : `Step ${step} of 4`}
                        </p>
                    </div>
                </div>

                {/* Step 1: LinkedIn */}
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="text-center py-8">
                            <SiLinkedin className="mx-auto text-5xl text-[#0077B5] mb-6 opacity-90" />
                            <h2 className="text-2xl font-serif font-semibold mb-3 text-[var(--text-primary)]">Connect your LinkedIn</h2>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                We'll fetch your education and experience to build your resume.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto">
                            <input
                                type="url"
                                placeholder="https://www.linkedin.com/in/username"
                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-2">Optional - you can skip this step</p>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleNext}
                                className="px-8 py-3 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-all shadow-sm"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Platforms */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Where do you showcase work?</h2>
                            <p className="text-[var(--text-secondary)] mt-1">Select the platforms you use to build your portfolio.</p>
                        </div>

                        <PlatformSelector
                            selectedPlatforms={selectedPlatforms}
                            onPlatformToggle={handlePlatformToggle}
                        />

                        <div className="flex justify-between pt-6 border-t border-[var(--border-light)] mt-8">
                            <button
                                onClick={handleBack}
                                className="px-6 py-2 text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-8 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-all shadow-sm"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Enter URLs */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Link your profiles</h2>
                            <p className="text-[var(--text-secondary)] mt-1">Enter your profile URLs so we can fetch your work.</p>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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

                            {selectedPlatforms.length === 0 && (
                                <div className="text-center py-12 text-[var(--text-secondary)] italic">
                                    No platforms selected. You can add them later in Settings.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-6 border-t border-[var(--border-light)] mt-8">
                            <button
                                onClick={handleBack}
                                className="px-6 py-2 text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-8 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-all shadow-sm"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Target Role */}
                {step === 4 && (
                    <div className="space-y-8">
                        <div className="text-center py-4">
                            <div className="text-4xl mb-4">🎯</div>
                            <h2 className="text-2xl font-serif font-semibold mb-3 text-[var(--text-primary)]">What's your target role?</h2>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                This helps us tailor your resume and highlight the right skills for the job.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 block">
                                Desired Job Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Senior Frontend Engineer, Product Manager"
                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50 font-medium"
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-between pt-6 border-t border-[var(--border-light)] mt-8">
                            <button
                                onClick={handleBack}
                                className="px-6 py-2 text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleContinueToSync}
                                disabled={isLoading || !targetRole}
                                className="px-8 py-2 bg-[var(--github-green)] text-white rounded-md font-medium hover:opacity-90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Start Syncing'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Syncing Progress */}
                {step === 5 && (
                    <div className="space-y-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--green-light)] mb-6">
                                <MdSync className={`text-3xl text-[var(--github-green)] ${isSyncing ? 'animate-spin' : ''}`} />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)] mb-2">
                                {isSyncing ? 'Syncing your profiles...' : 'Setup complete!'}
                            </h2>
                            <p className="text-[var(--text-secondary)]">
                                {isSyncing
                                    ? 'We\'re fetching your projects and experience. This may take a moment.'
                                    : 'Successfully synced your profiles. Redirecting to dashboard...'
                                }
                            </p>
                        </div>

                        <div className="max-w-md mx-auto space-y-3">
                            {linkedinUrl && (
                                <SyncItem
                                    name="LinkedIn"
                                    status={syncProgress['linkedin'] || 'pending'}
                                    icon={SiLinkedin}
                                    color="#0077B5"
                                />
                            )}

                            {selectedPlatforms.map(id => {
                                const platform = getPlatformById(id)
                                if (!platform) return null

                                return (
                                    <SyncItem
                                        key={id}
                                        name={platform.name}
                                        status={syncProgress[id] || 'pending'}
                                        icon={platform.icon}
                                        color={platform.color}
                                    />
                                )
                            })}
                        </div>

                        {!isSyncing && (
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 text-[var(--github-green)] font-medium">
                                    <MdCheckCircle />
                                    All profiles synced successfully
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// Sync status component
function SyncItem({
    name,
    status,
    icon: Icon,
    color
}: {
    name: string
    status: 'pending' | 'syncing' | 'complete'
    icon: any
    color: string
}) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-light)] bg-white">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--bg-light)] rounded-md">
                <Icon className="text-xl" style={{ color }} />
            </div>
            <div className="flex-1">
                <div className="font-medium text-[var(--text-primary)]">{name}</div>
            </div>
            <div className="flex-shrink-0">
                {status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-light)]" />
                )}
                {status === 'syncing' && (
                    <MdSync className="text-xl text-[var(--orange-primary)] animate-spin" />
                )}
                {status === 'complete' && (
                    <MdCheckCircle className="text-xl text-[var(--github-green)]" />
                )}
            </div>
        </div>
    )
}
