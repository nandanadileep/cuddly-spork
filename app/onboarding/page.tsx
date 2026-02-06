'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SiLinkedin } from 'react-icons/si'
import { MdCheckCircle, MdLanguage, MdSchool, MdSync, MdWorkOutline } from 'react-icons/md'
import PlatformSelector from '@/components/PlatformSelector'
import { getPlatformById } from '@/lib/constants/platforms'

export default function OnboardingPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [targetRole, setTargetRole] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({})

    const [isFetchingWebsite, setIsFetchingWebsite] = useState(false)
    const [websitePreview, setWebsitePreview] = useState<{ title: string | null; description: string | null; url: string } | null>(null)
    const [websiteFetchError, setWebsiteFetchError] = useState('')

    const [profileCounts, setProfileCounts] = useState<{ education: number; experience: number } | null>(null)
    const [profileSaveError, setProfileSaveError] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    const [newEducation, setNewEducation] = useState({
        institution: '',
        degree: '',
        field: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
    })

    const [newExperience, setNewExperience] = useState({
        company: '',
        position: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
    })

    // Syncing state
    const [syncProgress, setSyncProgress] = useState<Record<string, 'pending' | 'syncing' | 'complete'>>({})
    const [isSyncing, setIsSyncing] = useState(false)

    const totalSteps = 7

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

    const fetchWebsiteDetails = async () => {
        if (!websiteUrl.trim()) return
        setIsFetchingWebsite(true)
        setWebsiteFetchError('')
        setWebsitePreview(null)
        try {
            const res = await fetch('/api/profile/fetch-website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: websiteUrl }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && data?.success) {
                setWebsitePreview(data.data)
            } else {
                setWebsiteFetchError(data.error || 'Could not fetch this URL.')
            }
        } catch (error) {
            console.error('Website fetch error:', error)
            setWebsiteFetchError('Could not fetch this URL.')
        } finally {
            setIsFetchingWebsite(false)
        }
    }

    const refreshProfileCounts = async () => {
        try {
            const res = await fetch('/api/resume/preview')
            const data = await res.json().catch(() => ({}))
            if (res.ok && data?.success) {
                setProfileCounts({
                    education: data.counts?.education || 0,
                    experience: data.counts?.experience || 0,
                })
            }
        } catch (error) {
            console.error('Failed to refresh profile counts:', error)
        }
    }

    useEffect(() => {
        if (step === 3 && session) {
            refreshProfileCounts()
        }
    }, [step, session])

    const addEducation = async () => {
        setIsSavingProfile(true)
        setProfileSaveError('')
        try {
            const res = await fetch('/api/profile/education', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEducation),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setProfileSaveError(data.error || 'Failed to add education')
                return
            }
            setNewEducation({
                institution: '',
                degree: '',
                field: '',
                location: '',
                start_date: '',
                end_date: '',
                is_current: false,
                description: '',
            })
            await refreshProfileCounts()
        } catch (error) {
            console.error('Add education error:', error)
            setProfileSaveError('Failed to add education')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const addExperience = async () => {
        setIsSavingProfile(true)
        setProfileSaveError('')
        try {
            const res = await fetch('/api/profile/experience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExperience),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setProfileSaveError(data.error || 'Failed to add work experience')
                return
            }
            setNewExperience({
                company: '',
                position: '',
                location: '',
                start_date: '',
                end_date: '',
                is_current: false,
                description: '',
            })
            await refreshProfileCounts()
        } catch (error) {
            console.error('Add experience error:', error)
            setProfileSaveError('Failed to add work experience')
        } finally {
            setIsSavingProfile(false)
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

        const syncEndpoint: Record<string, string> = {
            github: '/api/sync/github',
            gitlab: '/api/sync/gitlab',
            bitbucket: '/api/sync/bitbucket',
            devto: '/api/sync/devto',
            medium: '/api/sync/medium',
            substack: '/api/sync/substack',
            huggingface: '/api/sync/huggingface',
            codeforces: '/api/sync/codeforces',
        }

        for (const platformId of platformsToSync) {
            setSyncProgress(prev => ({ ...prev, [platformId]: 'syncing' }))

            try {
                if (platformId === 'linkedin') {
                    // Public-only LinkedIn sync isn't supported (scraping is flaky/blocked).
                    await new Promise(resolve => setTimeout(resolve, 500))
                } else {
                    const endpoint = syncEndpoint[platformId]
                    const username = platformUrls[platformId]

                    if (endpoint && username) {
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username }),
                        })

                        if (!response.ok) {
                            console.error(`${platformId} sync failed:`, await response.text())
                        }
                    } else {
                        // Platform not implemented (yet) or no input provided.
                        await new Promise(resolve => setTimeout(resolve, 250))
                    }
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
                    websiteUrl,
                    targetRole,
                    platforms: selectedPlatforms.map(id => ({
                        id,
                        url: platformUrls[id]
                    }))
                }),
            })

            if (response.ok) {
                handleNext() // Go to sync step
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
                                {step === totalSteps ? 'Setting up your profile...' : `Step ${step} of ${totalSteps - 1}`}
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
                                Optional. We'll include this link on your resume. Next, you'll add education and work experience.
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

	                {/* Step 2: Personal Website */}
	                {step === 2 && (
	                    <div className="space-y-8">
	                        <div className="text-center py-8">
	                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
	                                <MdLanguage className="text-3xl text-[var(--orange-primary)]" />
	                            </div>
	                            <h2 className="text-2xl font-serif font-semibold mb-3 text-[var(--text-primary)]">Add your personal website</h2>
	                            <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
	                                Optional. We'll include it on your resume and try to fetch basic details from it.
	                            </p>
	                        </div>

	                        <div className="max-w-lg mx-auto space-y-3">
	                            <input
	                                type="url"
	                                placeholder="https://your-site.com"
	                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
	                                value={websiteUrl}
	                                onChange={(e) => setWebsiteUrl(e.target.value)}
	                            />
	                            <div className="flex items-center gap-2">
	                                <button
	                                    type="button"
	                                    onClick={fetchWebsiteDetails}
	                                    disabled={isFetchingWebsite || !websiteUrl.trim()}
	                                    className="px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
	                                >
	                                    {isFetchingWebsite ? 'Fetching...' : 'Fetch details'}
	                                </button>
	                                <p className="text-xs text-[var(--text-secondary)]">Optional</p>
	                            </div>

	                            {websiteFetchError && (
	                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
	                                    {websiteFetchError}
	                                </div>
	                            )}

	                            {websitePreview && (
	                                <div className="p-4 rounded-lg border border-[var(--border-light)] bg-white space-y-1">
	                                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Preview</div>
	                                    <div className="font-semibold text-[var(--text-primary)]">{websitePreview.title || websitePreview.url}</div>
	                                    {websitePreview.description && (
	                                        <div className="text-sm text-[var(--text-secondary)]">{websitePreview.description}</div>
	                                    )}
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

	                {/* Step 3: Education & Work */}
	                {step === 3 && (
	                    <div className="space-y-8">
	                        <div className="text-center mb-8">
	                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Education & Work Experience</h2>
	                            <p className="text-[var(--text-secondary)] mt-1">
	                                Add what you want included in your resume. You can also update this later in Profile.
	                            </p>
	                            {profileCounts && (
	                                <p className="text-sm text-[var(--text-secondary)] mt-2">
	                                    Current: {profileCounts.experience} experience · {profileCounts.education} education
	                                </p>
	                            )}
	                        </div>

	                        {profileSaveError && (
	                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
	                                {profileSaveError}
	                            </div>
	                        )}

	                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
	                            <div className="p-4 rounded-lg border border-[var(--border-light)] bg-white space-y-3">
	                                <div className="flex items-center gap-2">
	                                    <MdSchool className="text-xl text-[var(--orange-primary)]" />
	                                    <h3 className="font-semibold text-[var(--text-primary)]">Education</h3>
	                                </div>
	                                <input
	                                    type="text"
	                                    placeholder="Institution"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newEducation.institution}
	                                    onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
	                                />
	                                <input
	                                    type="text"
	                                    placeholder="Degree"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newEducation.degree}
	                                    onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
	                                />
	                                <input
	                                    type="text"
	                                    placeholder="Field (optional)"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newEducation.field}
	                                    onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
	                                />
	                                <div className="flex gap-2">
	                                    <input
	                                        type="date"
	                                        className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                        value={newEducation.start_date}
	                                        onChange={(e) => setNewEducation({ ...newEducation, start_date: e.target.value })}
	                                    />
	                                    <input
	                                        type="date"
	                                        disabled={newEducation.is_current}
	                                        className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] disabled:opacity-50"
	                                        value={newEducation.end_date}
	                                        onChange={(e) => setNewEducation({ ...newEducation, end_date: e.target.value })}
	                                    />
	                                </div>
	                                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
	                                    <input
	                                        type="checkbox"
	                                        checked={newEducation.is_current}
	                                        onChange={(e) => setNewEducation({ ...newEducation, is_current: e.target.checked, end_date: e.target.checked ? '' : newEducation.end_date })}
	                                    />
	                                    Current
	                                </label>
	                                <textarea
	                                    placeholder="Description (optional)"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[90px]"
	                                    value={newEducation.description}
	                                    onChange={(e) => setNewEducation({ ...newEducation, description: e.target.value })}
	                                />
	                                <button
	                                    type="button"
	                                    onClick={addEducation}
	                                    disabled={isSavingProfile || !newEducation.institution.trim() || !newEducation.degree.trim()}
	                                    className="w-full px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] disabled:opacity-50"
	                                >
	                                    {isSavingProfile ? 'Saving...' : 'Add education'}
	                                </button>
	                            </div>

	                            <div className="p-4 rounded-lg border border-[var(--border-light)] bg-white space-y-3">
	                                <div className="flex items-center gap-2">
	                                    <MdWorkOutline className="text-xl text-[var(--orange-primary)]" />
	                                    <h3 className="font-semibold text-[var(--text-primary)]">Work Experience</h3>
	                                </div>
	                                <input
	                                    type="text"
	                                    placeholder="Company"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newExperience.company}
	                                    onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
	                                />
	                                <input
	                                    type="text"
	                                    placeholder="Position"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newExperience.position}
	                                    onChange={(e) => setNewExperience({ ...newExperience, position: e.target.value })}
	                                />
	                                <input
	                                    type="text"
	                                    placeholder="Location (optional)"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                    value={newExperience.location}
	                                    onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
	                                />
	                                <div className="flex gap-2">
	                                    <input
	                                        type="date"
	                                        className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
	                                        value={newExperience.start_date}
	                                        onChange={(e) => setNewExperience({ ...newExperience, start_date: e.target.value })}
	                                    />
	                                    <input
	                                        type="date"
	                                        disabled={newExperience.is_current}
	                                        className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] disabled:opacity-50"
	                                        value={newExperience.end_date}
	                                        onChange={(e) => setNewExperience({ ...newExperience, end_date: e.target.value })}
	                                    />
	                                </div>
	                                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
	                                    <input
	                                        type="checkbox"
	                                        checked={newExperience.is_current}
	                                        onChange={(e) => setNewExperience({ ...newExperience, is_current: e.target.checked, end_date: e.target.checked ? '' : newExperience.end_date })}
	                                    />
	                                    Current
	                                </label>
	                                <textarea
	                                    placeholder="Description (optional)"
	                                    className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[90px]"
	                                    value={newExperience.description}
	                                    onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
	                                />
	                                <button
	                                    type="button"
	                                    onClick={addExperience}
	                                    disabled={isSavingProfile || !newExperience.company.trim() || !newExperience.position.trim()}
	                                    className="w-full px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] disabled:opacity-50"
	                                >
	                                    {isSavingProfile ? 'Saving...' : 'Add experience'}
	                                </button>
	                            </div>
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

	                {/* Step 4: Select Platforms */}
	                {step === 4 && (
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

	                {/* Step 5: Enter URLs */}
	                {step === 5 && (
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

	                {/* Step 6: Target Role */}
	                {step === 6 && (
	                    <div className="space-y-8">
                        <div className="text-center py-4">
                            <div className="text-4xl mb-4"></div>
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

	                {/* Step 7: Syncing Progress */}
	                {step === 7 && (
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
