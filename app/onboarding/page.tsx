'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SiLinkedin } from 'react-icons/si'
import { MdCheckCircle, MdEmojiEvents, MdGroups, MdLanguage, MdMenuBook, MdSchool, MdSync, MdUploadFile, MdWorkOutline } from 'react-icons/md'
import PlatformSelector from '@/components/PlatformSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { getPlatformById } from '@/lib/constants/platforms'

export default function OnboardingPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [isGeneratingRoleSnapshot, setIsGeneratingRoleSnapshot] = useState(false)
    const [roleSnapshotReady, setRoleSnapshotReady] = useState(false)
    const [roleSnapshotError, setRoleSnapshotError] = useState('')

    // Form State
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [targetRole, setTargetRole] = useState('')
    const [firstName, setFirstName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [lastName, setLastName] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({})

    const [isFetchingWebsite, setIsFetchingWebsite] = useState(false)
    const [websitePreview, setWebsitePreview] = useState<{ title: string | null; description: string | null; url: string } | null>(null)
    const [websiteFetchError, setWebsiteFetchError] = useState('')

    const [profileCounts, setProfileCounts] = useState<{
        education: number
        experience: number
        extracurriculars: number
        awards: number
        publications: number
    } | null>(null)
    const [profileSaveError, setProfileSaveError] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [isExtractingResume, setIsExtractingResume] = useState(false)
    const [resumeExtractError, setResumeExtractError] = useState('')
    const [resumeExtractSummary, setResumeExtractSummary] = useState<{
        skills: number
        projects: number
        education: number
        experience: number
        extracurriculars: number
        awards: number
        publications: number
        contactFields: number
    } | null>(null)

    const emptyEducation = {
        institution: '',
        degree: '',
        field: '',
        cgpa: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
    }

    const emptyExperience = {
        company: '',
        position: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
    }

    const emptyExtracurricular = {
        title: '',
        organization: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
    }

    const emptyAward = {
        title: '',
        issuer: '',
        awarded_at: '',
        description: '',
    }

    const emptyPublication = {
        title: '',
        venue: '',
        url: '',
        published_at: '',
        description: '',
    }

    type EducationDraft = typeof emptyEducation
    type ExperienceDraft = typeof emptyExperience
    type ExtracurricularDraft = typeof emptyExtracurricular
    type AwardDraft = typeof emptyAward
    type PublicationDraft = typeof emptyPublication

    const [newEducation, setNewEducation] = useState<EducationDraft>({ ...emptyEducation })
    const [newExperience, setNewExperience] = useState<ExperienceDraft>({ ...emptyExperience })
    const [newExtracurricular, setNewExtracurricular] = useState<ExtracurricularDraft>({ ...emptyExtracurricular })
    const [newAward, setNewAward] = useState<AwardDraft>({ ...emptyAward })
    const [newPublication, setNewPublication] = useState<PublicationDraft>({ ...emptyPublication })
    const [pendingEducation, setPendingEducation] = useState<EducationDraft[]>([])
    const [pendingExperience, setPendingExperience] = useState<ExperienceDraft[]>([])
    const [pendingExtracurriculars, setPendingExtracurriculars] = useState<ExtracurricularDraft[]>([])
    const [pendingAwards, setPendingAwards] = useState<AwardDraft[]>([])
    const [pendingPublications, setPendingPublications] = useState<PublicationDraft[]>([])

    // Syncing state
    const [syncProgress, setSyncProgress] = useState<Record<string, 'pending' | 'syncing' | 'complete'>>({})
    const [isSyncing, setIsSyncing] = useState(false)

    const educationStep = 4
    const experienceStep = 5
    const extracurricularStep = 6
    const awardsStep = 7
    const publicationsStep = 8
    const platformSelectStep = 9
    const platformUrlsStep = 10
    const targetRoleStep = 11
    const syncStep = 12
    const totalSteps = syncStep

    const handleNext = async () => {
        if (isSavingProfile) return
        if (step === educationStep) {
            const ok = await saveEducationOnContinue()
            if (!ok) return
        }
        if (step === experienceStep) {
            const ok = await saveExperienceOnContinue()
            if (!ok) return
        }
        if (step === extracurricularStep) {
            const ok = await saveExtracurricularOnContinue()
            if (!ok) return
        }
        if (step === awardsStep) {
            const ok = await saveAwardsOnContinue()
            if (!ok) return
        }
        if (step === publicationsStep) {
            const ok = await savePublicationsOnContinue()
            if (!ok) return
        }
        setStep(prev => prev + 1)
    }
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
                    extracurriculars: data.counts?.extracurriculars || 0,
                    awards: data.counts?.awards || 0,
                    publications: data.counts?.publications || 0,
                })
            }
        } catch (error) {
            console.error('Failed to refresh profile counts:', error)
        }
    }

    useEffect(() => {
        if (
            (step === educationStep ||
                step === experienceStep ||
                step === extracurricularStep ||
                step === awardsStep ||
                step === publicationsStep) &&
            session
        ) {
            refreshProfileCounts()
        }
    }, [step, session, educationStep, experienceStep, extracurricularStep, awardsStep, publicationsStep])

    const handleResumeExtract = async () => {
        if (!resumeFile) {
            setResumeExtractError('Please choose a resume file to upload.')
            return
        }

        setIsExtractingResume(true)
        setResumeExtractError('')
        setResumeExtractSummary(null)

        try {
            const formData = new FormData()
            formData.append('file', resumeFile)

            const res = await fetch('/api/profile/resume-import', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setResumeExtractError(data.error || 'Failed to extract resume details.')
                return
            }

            setResumeExtractSummary(data.summary || null)
            await refreshProfileCounts()
        } catch (error) {
            console.error('Resume extract error:', error)
            setResumeExtractError('Failed to extract resume details.')
        } finally {
            setIsExtractingResume(false)
        }
    }

    const hasEducationInput = (entry: EducationDraft) =>
        Boolean(
            entry.institution.trim() ||
            entry.degree.trim() ||
            entry.field.trim() ||
            entry.cgpa.trim() ||
            entry.location.trim() ||
            entry.start_date ||
            entry.end_date ||
            entry.description.trim()
        )

    const isEducationComplete = (entry: EducationDraft) =>
        entry.institution.trim().length > 0 && entry.degree.trim().length > 0

    const queueEducation = () => {
        if (!isEducationComplete(newEducation)) {
            setProfileSaveError('Add an institution and degree to queue this education.')
            return
        }
        setPendingEducation(prev => [...prev, { ...newEducation }])
        setNewEducation({ ...emptyEducation })
        setProfileSaveError('')
    }

    const removeEducation = (index: number) => {
        setPendingEducation(prev => prev.filter((_, i) => i !== index))
    }

    const saveEducationEntries = async (entries: EducationDraft[]) => {
        for (const entry of entries) {
            const res = await fetch('/api/profile/education', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add education')
            }
        }
    }

    const saveEducationOnContinue = async () => {
        setProfileSaveError('')
        const entries = [...pendingEducation]
        if (hasEducationInput(newEducation)) {
            if (!isEducationComplete(newEducation)) {
                setProfileSaveError('Please add both institution and degree before continuing.')
                return false
            }
            entries.push({ ...newEducation })
        }

        if (entries.length === 0) return true

        setIsSavingProfile(true)
        setProfileSaveError('')
        try {
            await saveEducationEntries(entries)
            setPendingEducation([])
            setNewEducation({ ...emptyEducation })
            await refreshProfileCounts()
            return true
        } catch (error) {
            console.error('Add education error:', error)
            setProfileSaveError(error instanceof Error ? error.message : 'Failed to add education')
            return false
        } finally {
            setIsSavingProfile(false)
        }
    }

    const hasExperienceInput = (entry: ExperienceDraft) =>
        Boolean(
            entry.company.trim() ||
            entry.position.trim() ||
            entry.location.trim() ||
            entry.start_date ||
            entry.end_date ||
            entry.description.trim()
        )

    const isExperienceComplete = (entry: ExperienceDraft) =>
        entry.company.trim().length > 0 && entry.position.trim().length > 0

    const queueExperience = () => {
        if (!isExperienceComplete(newExperience)) {
            setProfileSaveError('Add a company and position to queue this experience.')
            return
        }
        setPendingExperience(prev => [...prev, { ...newExperience }])
        setNewExperience({ ...emptyExperience })
        setProfileSaveError('')
    }

    const removeExperience = (index: number) => {
        setPendingExperience(prev => prev.filter((_, i) => i !== index))
    }

    const saveExperienceEntries = async (entries: ExperienceDraft[]) => {
        for (const entry of entries) {
            const res = await fetch('/api/profile/experience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add work experience')
            }
        }
    }

    const saveExperienceOnContinue = async () => {
        setProfileSaveError('')
        const entries = [...pendingExperience]
        if (hasExperienceInput(newExperience)) {
            if (!isExperienceComplete(newExperience)) {
                setProfileSaveError('Please add both company and position before continuing.')
                return false
            }
            entries.push({ ...newExperience })
        }

        if (entries.length === 0) return true

        setIsSavingProfile(true)
        setProfileSaveError('')
        try {
            await saveExperienceEntries(entries)
            setPendingExperience([])
            setNewExperience({ ...emptyExperience })
            await refreshProfileCounts()
            return true
        } catch (error) {
            console.error('Add experience error:', error)
            setProfileSaveError(error instanceof Error ? error.message : 'Failed to add work experience')
            return false
        } finally {
            setIsSavingProfile(false)
        }
    }

    const hasExtracurricularInput = (entry: ExtracurricularDraft) =>
        Boolean(
            entry.title.trim() ||
            entry.organization.trim() ||
            entry.location.trim() ||
            entry.start_date ||
            entry.end_date ||
            entry.description.trim()
        )

    const isExtracurricularComplete = (entry: ExtracurricularDraft) =>
        entry.title.trim().length > 0

    const queueExtracurricular = () => {
        if (!isExtracurricularComplete(newExtracurricular)) {
            setProfileSaveError('Add a title to queue this extracurricular.')
            return
        }
        setPendingExtracurriculars(prev => [...prev, { ...newExtracurricular }])
        setNewExtracurricular({ ...emptyExtracurricular })
        setProfileSaveError('')
    }

    const removeExtracurricular = (index: number) => {
        setPendingExtracurriculars(prev => prev.filter((_, i) => i !== index))
    }

    const saveExtracurricularEntries = async (entries: ExtracurricularDraft[]) => {
        for (const entry of entries) {
            const res = await fetch('/api/profile/extracurricular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add extracurricular')
            }
        }
    }

    const saveExtracurricularOnContinue = async () => {
        setProfileSaveError('')
        const entries = [...pendingExtracurriculars]
        if (hasExtracurricularInput(newExtracurricular)) {
            if (!isExtracurricularComplete(newExtracurricular)) {
                setProfileSaveError('Please add a title before continuing.')
                return false
            }
            entries.push({ ...newExtracurricular })
        }

        if (entries.length === 0) return true

        setIsSavingProfile(true)
        try {
            await saveExtracurricularEntries(entries)
            setPendingExtracurriculars([])
            setNewExtracurricular({ ...emptyExtracurricular })
            await refreshProfileCounts()
            return true
        } catch (error) {
            console.error('Add extracurricular error:', error)
            setProfileSaveError(error instanceof Error ? error.message : 'Failed to add extracurricular')
            return false
        } finally {
            setIsSavingProfile(false)
        }
    }

    const hasAwardInput = (entry: AwardDraft) =>
        Boolean(
            entry.title.trim() ||
            entry.issuer.trim() ||
            entry.awarded_at ||
            entry.description.trim()
        )

    const isAwardComplete = (entry: AwardDraft) => entry.title.trim().length > 0

    const queueAward = () => {
        if (!isAwardComplete(newAward)) {
            setProfileSaveError('Add a title to queue this award.')
            return
        }
        setPendingAwards(prev => [...prev, { ...newAward }])
        setNewAward({ ...emptyAward })
        setProfileSaveError('')
    }

    const removeAward = (index: number) => {
        setPendingAwards(prev => prev.filter((_, i) => i !== index))
    }

    const saveAwardEntries = async (entries: AwardDraft[]) => {
        for (const entry of entries) {
            const res = await fetch('/api/profile/awards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add award')
            }
        }
    }

    const saveAwardsOnContinue = async () => {
        setProfileSaveError('')
        const entries = [...pendingAwards]
        if (hasAwardInput(newAward)) {
            if (!isAwardComplete(newAward)) {
                setProfileSaveError('Please add a title before continuing.')
                return false
            }
            entries.push({ ...newAward })
        }

        if (entries.length === 0) return true

        setIsSavingProfile(true)
        try {
            await saveAwardEntries(entries)
            setPendingAwards([])
            setNewAward({ ...emptyAward })
            await refreshProfileCounts()
            return true
        } catch (error) {
            console.error('Add award error:', error)
            setProfileSaveError(error instanceof Error ? error.message : 'Failed to add award')
            return false
        } finally {
            setIsSavingProfile(false)
        }
    }

    const hasPublicationInput = (entry: PublicationDraft) =>
        Boolean(
            entry.title.trim() ||
            entry.venue.trim() ||
            entry.url.trim() ||
            entry.published_at ||
            entry.description.trim()
        )

    const isPublicationComplete = (entry: PublicationDraft) => entry.title.trim().length > 0

    const queuePublication = () => {
        if (!isPublicationComplete(newPublication)) {
            setProfileSaveError('Add a title to queue this publication.')
            return
        }
        setPendingPublications(prev => [...prev, { ...newPublication }])
        setNewPublication({ ...emptyPublication })
        setProfileSaveError('')
    }

    const removePublication = (index: number) => {
        setPendingPublications(prev => prev.filter((_, i) => i !== index))
    }

    const savePublicationEntries = async (entries: PublicationDraft[]) => {
        for (const entry of entries) {
            const res = await fetch('/api/profile/publications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add publication')
            }
        }
    }

    const savePublicationsOnContinue = async () => {
        setProfileSaveError('')
        const entries = [...pendingPublications]
        if (hasPublicationInput(newPublication)) {
            if (!isPublicationComplete(newPublication)) {
                setProfileSaveError('Please add a title before continuing.')
                return false
            }
            entries.push({ ...newPublication })
        }

        if (entries.length === 0) return true

        setIsSavingProfile(true)
        try {
            await savePublicationEntries(entries)
            setPendingPublications([])
            setNewPublication({ ...emptyPublication })
            await refreshProfileCounts()
            return true
        } catch (error) {
            console.error('Add publication error:', error)
            setProfileSaveError(error instanceof Error ? error.message : 'Failed to add publication')
            return false
        } finally {
            setIsSavingProfile(false)
        }
    }

    const ensureRoleSnapshot = async () => {
        const trimmedRole = targetRole.trim()
        if (!trimmedRole || roleSnapshotReady) return roleSnapshotReady

        setIsGeneratingRoleSnapshot(true)
        setRoleSnapshotError('')

        try {
            const res = await fetch('/api/profile/target-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_role: trimmedRole })
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setRoleSnapshotError(data.error || 'Failed to create role snapshot.')
                return false
            }
            setRoleSnapshotReady(true)
            return true
        } catch (error) {
            console.error('Role snapshot error:', error)
            setRoleSnapshotError('Failed to create role snapshot.')
            return false
        } finally {
            setIsGeneratingRoleSnapshot(false)
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
            const snapshotOk = await ensureRoleSnapshot()
            // Save URLs to backend
            const response = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkedinUrl,
                    websiteUrl,
                    targetRole,
                    firstName,
                    middleName,
                    lastName,
                    skipRoleSnapshot: snapshotOk,
                    platforms: selectedPlatforms.map(id => ({
                        id,
                        url: platformUrls[id]
                    }))
                }),
            })

            if (response.ok) {
                setStep(prev => prev + 1) // Go to sync step
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
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <div className="bg-[var(--bg-card)] max-w-3xl w-full rounded-lg shadow-sm border border-[var(--border-light)] p-8 my-8">

                {/* Progress */}
                <div className="sticky top-0 z-20 bg-[var(--bg-card)] border-b border-[var(--border-light)] pb-4 mb-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Profile setup</p>
                            <p className="text-[var(--text-secondary)] mt-1 font-sans">
                                {step === totalSteps ? 'Setting up your profile...' : `Step ${step} of ${totalSteps - 1}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 1: LinkedIn */}
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="text-center py-8">
                            <SiLinkedin className="mx-auto text-5xl text-[#0077B5] mb-6 opacity-90" />
                            <h2 className="text-2xl font-serif font-semibold mb-3 text-[var(--text-primary)]">Connect your LinkedIn</h2>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                Optional. We'll include this link on your resume. Next, you'll add education, work experience, and more.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    placeholder="First name (optional)"
                                    className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Middle name (optional)"
                                    className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
                                    value={middleName}
                                    onChange={(e) => setMiddleName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Last name (optional)"
                                    className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                            <input
                                type="url"
                                placeholder="https://www.linkedin.com/in/username"
                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] focus:ring-1 focus:ring-[var(--orange-primary)] focus:border-[var(--orange-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-2">Optional - you can skip this step</p>
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

                    </div>
                )}

                {/* Step 3: Upload Resume */}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdUploadFile className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold mb-3 text-[var(--text-primary)]">Upload your existing resume</h2>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                Optional. We’ll extract skills, projects, education, work experience, extracurriculars, awards, and publications so you can review them later.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto space-y-4">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Resume file (PDF, DOCX, or TXT)</label>
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                            />
                            <button
                                type="button"
                                onClick={handleResumeExtract}
                                disabled={!resumeFile || isExtractingResume}
                                className="w-full px-4 py-2 rounded-md bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                            >
                                {isExtractingResume ? 'Extracting...' : 'Upload & Extract'}
                            </button>
                            {resumeExtractError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {resumeExtractError}
                                </div>
                            )}
                            {resumeExtractSummary && (
                                <div className="p-4 rounded-lg border border-[var(--border-light)] bg-white space-y-1 text-sm text-[var(--text-secondary)]">
                                    <div className="font-semibold text-[var(--text-primary)]">Imported summary</div>
                                    <div>Skills: {resumeExtractSummary.skills}</div>
                                    <div>Projects: {resumeExtractSummary.projects}</div>
                                    <div>Education: {resumeExtractSummary.education}</div>
                                    <div>Work Experience: {resumeExtractSummary.experience}</div>
                                    <div>Extracurriculars: {resumeExtractSummary.extracurriculars}</div>
                                    <div>Awards: {resumeExtractSummary.awards}</div>
                                    <div>Publications: {resumeExtractSummary.publications}</div>
                                    <div>Contact fields updated: {resumeExtractSummary.contactFields}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Education */}
                {step === educationStep && (
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdSchool className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Education</h2>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Optional. Add your education now or later in Profile.
                            </p>
                            {profileCounts && (
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Current: {profileCounts.education} education
                                </p>
                            )}
                            {pendingEducation.length > 0 && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Pending additions: {pendingEducation.length}
                                </p>
                            )}
                        </div>

                        {profileSaveError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                {profileSaveError}
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto space-y-3">
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
                            <input
                                type="text"
                                placeholder="CGPA (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newEducation.cgpa}
                                onChange={(e) => setNewEducation({ ...newEducation, cgpa: e.target.value })}
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
                                onClick={queueEducation}
                                disabled={isSavingProfile || !newEducation.institution.trim() || !newEducation.degree.trim()}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                            >
                                Add another education
                            </button>
                            <p className="text-xs text-[var(--text-secondary)]">
                                We’ll save your education entries when you continue.
                            </p>
                        </div>

                        {pendingEducation.length > 0 && (
                            <div className="max-w-2xl mx-auto rounded-lg border border-[var(--border-light)] bg-white p-4 space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Pending education
                                </div>
                                {pendingEducation.map((education, index) => (
                                    <div
                                        key={`education-${index}`}
                                        className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                                {education.institution || 'Untitled education'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {education.degree}{education.field ? ` · ${education.field}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeEducation(index)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 5: Work Experience */}
                {step === experienceStep && (
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdWorkOutline className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Work Experience</h2>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Optional. Add your roles now or later in Profile.
                            </p>
                            {profileCounts && (
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Current: {profileCounts.experience} experience
                                </p>
                            )}
                            {pendingExperience.length > 0 && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Pending additions: {pendingExperience.length}
                                </p>
                            )}
                        </div>

                        {profileSaveError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                {profileSaveError}
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto space-y-3">
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
                                onClick={queueExperience}
                                disabled={isSavingProfile || !newExperience.company.trim() || !newExperience.position.trim()}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                            >
                                Add another experience
                            </button>
                            <p className="text-xs text-[var(--text-secondary)]">
                                We’ll save your experience entries when you continue.
                            </p>
                        </div>

                        {pendingExperience.length > 0 && (
                            <div className="max-w-2xl mx-auto rounded-lg border border-[var(--border-light)] bg-white p-4 space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Pending experience
                                </div>
                                {pendingExperience.map((experience, index) => (
                                    <div
                                        key={`experience-${index}`}
                                        className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                                {experience.position || 'Untitled role'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {experience.company}
                                                {experience.location ? ` · ${experience.location}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 6: Extracurriculars */}
                {step === extracurricularStep && (
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdGroups className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Extracurriculars</h2>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Optional. Add clubs, volunteering, or leadership roles now or later in Profile.
                            </p>
                            {profileCounts && (
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Current: {profileCounts.extracurriculars} extracurriculars
                                </p>
                            )}
                            {pendingExtracurriculars.length > 0 && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Pending additions: {pendingExtracurriculars.length}
                                </p>
                            )}
                        </div>

                        {profileSaveError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                {profileSaveError}
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto space-y-3">
                            <input
                                type="text"
                                placeholder="Title"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newExtracurricular.title}
                                onChange={(e) => setNewExtracurricular({ ...newExtracurricular, title: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Organization (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newExtracurricular.organization}
                                onChange={(e) => setNewExtracurricular({ ...newExtracurricular, organization: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Location (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newExtracurricular.location}
                                onChange={(e) => setNewExtracurricular({ ...newExtracurricular, location: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                    value={newExtracurricular.start_date}
                                    onChange={(e) => setNewExtracurricular({ ...newExtracurricular, start_date: e.target.value })}
                                />
                                <input
                                    type="date"
                                    disabled={newExtracurricular.is_current}
                                    className="flex-1 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] disabled:opacity-50"
                                    value={newExtracurricular.end_date}
                                    onChange={(e) => setNewExtracurricular({ ...newExtracurricular, end_date: e.target.value })}
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <input
                                    type="checkbox"
                                    checked={newExtracurricular.is_current}
                                    onChange={(e) =>
                                        setNewExtracurricular({
                                            ...newExtracurricular,
                                            is_current: e.target.checked,
                                            end_date: e.target.checked ? '' : newExtracurricular.end_date,
                                        })
                                    }
                                />
                                Current
                            </label>
                            <textarea
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[90px]"
                                value={newExtracurricular.description}
                                onChange={(e) => setNewExtracurricular({ ...newExtracurricular, description: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={queueExtracurricular}
                                disabled={isSavingProfile || !newExtracurricular.title.trim()}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                            >
                                Add another extracurricular
                            </button>
                            <p className="text-xs text-[var(--text-secondary)]">
                                We’ll save your extracurricular entries when you continue.
                            </p>
                        </div>

                        {pendingExtracurriculars.length > 0 && (
                            <div className="max-w-2xl mx-auto rounded-lg border border-[var(--border-light)] bg-white p-4 space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Pending extracurriculars
                                </div>
                                {pendingExtracurriculars.map((item, index) => (
                                    <div
                                        key={`extracurricular-${index}`}
                                        className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                                {item.title || 'Untitled extracurricular'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {item.organization || 'Organization not specified'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeExtracurricular(index)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 7: Awards */}
                {step === awardsStep && (
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdEmojiEvents className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Awards</h2>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Optional. Add honors or recognitions now or later in Profile.
                            </p>
                            {profileCounts && (
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Current: {profileCounts.awards} awards
                                </p>
                            )}
                            {pendingAwards.length > 0 && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Pending additions: {pendingAwards.length}
                                </p>
                            )}
                        </div>

                        {profileSaveError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                {profileSaveError}
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto space-y-3">
                            <input
                                type="text"
                                placeholder="Award title"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newAward.title}
                                onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Issuer (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newAward.issuer}
                                onChange={(e) => setNewAward({ ...newAward, issuer: e.target.value })}
                            />
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newAward.awarded_at}
                                onChange={(e) => setNewAward({ ...newAward, awarded_at: e.target.value })}
                            />
                            <textarea
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[90px]"
                                value={newAward.description}
                                onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={queueAward}
                                disabled={isSavingProfile || !newAward.title.trim()}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                            >
                                Add another award
                            </button>
                            <p className="text-xs text-[var(--text-secondary)]">
                                We’ll save your awards when you continue.
                            </p>
                        </div>

                        {pendingAwards.length > 0 && (
                            <div className="max-w-2xl mx-auto rounded-lg border border-[var(--border-light)] bg-white p-4 space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Pending awards
                                </div>
                                {pendingAwards.map((item, index) => (
                                    <div
                                        key={`award-${index}`}
                                        className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                                {item.title || 'Untitled award'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {item.issuer || 'Issuer not specified'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAward(index)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 8: Publications */}
                {step === publicationsStep && (
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-warm)] mb-6">
                                <MdMenuBook className="text-3xl text-[var(--orange-primary)]" />
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Publications</h2>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Optional. Add papers, articles, or blog posts now or later in Profile.
                            </p>
                            {profileCounts && (
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Current: {profileCounts.publications} publications
                                </p>
                            )}
                            {pendingPublications.length > 0 && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Pending additions: {pendingPublications.length}
                                </p>
                            )}
                        </div>

                        {profileSaveError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                {profileSaveError}
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto space-y-3">
                            <input
                                type="text"
                                placeholder="Publication title"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newPublication.title}
                                onChange={(e) => setNewPublication({ ...newPublication, title: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Venue / Journal (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newPublication.venue}
                                onChange={(e) => setNewPublication({ ...newPublication, venue: e.target.value })}
                            />
                            <input
                                type="url"
                                placeholder="URL (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newPublication.url}
                                onChange={(e) => setNewPublication({ ...newPublication, url: e.target.value })}
                            />
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                value={newPublication.published_at}
                                onChange={(e) => setNewPublication({ ...newPublication, published_at: e.target.value })}
                            />
                            <textarea
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[90px]"
                                value={newPublication.description}
                                onChange={(e) => setNewPublication({ ...newPublication, description: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={queuePublication}
                                disabled={isSavingProfile || !newPublication.title.trim()}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                            >
                                Add another publication
                            </button>
                            <p className="text-xs text-[var(--text-secondary)]">
                                We’ll save your publications when you continue.
                            </p>
                        </div>

                        {pendingPublications.length > 0 && (
                            <div className="max-w-2xl mx-auto rounded-lg border border-[var(--border-light)] bg-white p-4 space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Pending publications
                                </div>
                                {pendingPublications.map((item, index) => (
                                    <div
                                        key={`publication-${index}`}
                                        className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                                {item.title || 'Untitled publication'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {item.venue || item.url || 'Venue not specified'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removePublication(index)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 9: Select Platforms */}
                {step === platformSelectStep && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">Where do you showcase work?</h2>
                                <p className="text-[var(--text-secondary)] mt-1">Select the platforms you use to build your portfolio.</p>
                        </div>

                        <PlatformSelector
                            selectedPlatforms={selectedPlatforms}
                            onPlatformToggle={handlePlatformToggle}
                        />

                    </div>
                )}

                {/* Step 10: Enter URLs */}
                {step === platformUrlsStep && (
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

                        </div>
                    )}

                {/* Step 11: Target Role */}
                {step === targetRoleStep && (
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
                                onChange={(e) => {
                                    setTargetRole(e.target.value)
                                    setRoleSnapshotReady(false)
                                    setRoleSnapshotError('')
                                }}
                            />
                            {isGeneratingRoleSnapshot && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2">Creating your role snapshot...</p>
                            )}
                            {roleSnapshotReady && !isGeneratingRoleSnapshot && (
                                <p className="text-xs text-[var(--github-green)] mt-2">Role snapshot ready.</p>
                            )}
                            {roleSnapshotError && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {roleSnapshotError} We’ll retry during sync.
                                </div>
                            )}
                        </div>

                        </div>
                    )}

                {/* Step 12: Syncing Progress */}
                {step === syncStep && (
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

                {step < totalSteps && (
                    <div className="mt-10 pt-6 border-t border-[var(--border-light)]">
                        <div className={`flex items-center ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={step === targetRoleStep ? handleContinueToSync : handleNext}
                                disabled={isSavingProfile || (step === targetRoleStep ? (isLoading || !targetRole) : false)}
                                className={`px-6 py-2 rounded-md text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${step === targetRoleStep
                                    ? 'bg-[var(--github-green)] hover:opacity-90'
                                    : 'bg-[var(--orange-primary)] hover:bg-[var(--orange-hover)]'
                                    }`}
                            >
                                {step === targetRoleStep
                                    ? (isLoading ? 'Saving...' : 'Start Syncing')
                                    : (isSavingProfile ? 'Saving...' : 'Continue')}
                            </button>
                        </div>
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
