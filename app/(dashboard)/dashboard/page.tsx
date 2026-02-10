'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdCheckCircle, MdClose, MdLink, MdRadioButtonUnchecked } from 'react-icons/md'

interface Project {
    id: string
    name: string
    description: string | null
    url: string
    stars: number | null
    forks: number | null
    language: string | null
    platform: string
    ai_score: number | null
    ai_analysis_jsonb: any
    is_selected: boolean
}

interface JobDescriptionData {
    title?: string
    summary?: string
    requiredSkills?: string[]
    preferredSkills?: string[]
    responsibilities?: string[]
    tools?: string[]
    metrics?: string[]
    keywords?: string[]
    experienceLevel?: string
    industry?: string[]
}

export default function DashboardPage() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRoleLoading, setIsRoleLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isAutoSelecting, setIsAutoSelecting] = useState(false)
    const [analysisProgress, setAnalysisProgress] = useState<{ total: number; current: number; failed: number } | null>(null)
    const [analysisSelection, setAnalysisSelection] = useState<Record<string, boolean>>({})
    const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)
    const [analysisCooldown, setAnalysisCooldown] = useState(0)
    const [roleMode, setRoleMode] = useState<'title' | 'description'>('title')
    const [jobTitleInput, setJobTitleInput] = useState('')
    const [jobDescriptionInput, setJobDescriptionInput] = useState('')
    const [targetRole, setTargetRole] = useState<string | null>(null)
    const [jobDescription, setJobDescription] = useState<JobDescriptionData | null>(null)
    const [isSavingRole, setIsSavingRole] = useState(false)
    const [roleError, setRoleError] = useState('')
    const [showTour, setShowTour] = useState(false)
    const [tourStep, setTourStep] = useState(0)
    const [tourHideNext, setTourHideNext] = useState(false)
    const [connectionsCount, setConnectionsCount] = useState<number | null>(null)
    const [skillsCount, setSkillsCount] = useState<number | null>(null)

    const tourSteps = [
        {
            title: 'Connect your platforms',
            body: 'Add GitHub, Kaggle, Figma, or any other platform so we can pull your projects.',
            cta: 'Go to Settings',
            action: () => router.push('/settings'),
        },
        {
            title: 'Set a target role',
            body: 'Tell us the role you want so AI scoring is tailored to your goal.',
            cta: 'Update role',
            action: () => {
                const el = document.getElementById('target-role-card')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
        },
        {
            title: 'Analyze projects',
            body: 'Run AI scoring to prioritize your strongest projects for this role.',
            cta: 'Start analysis',
            action: () => router.push('/analysis'),
        },
        {
            title: 'Review skills',
            body: 'Confirm the skill list and remove anything that does not fit.',
            cta: 'Open analysis flow',
            action: () => router.push('/analysis'),
        },
        {
            title: 'Finalize your resume',
            body: 'Select projects, tune skills, and generate the final resume.',
            cta: 'Open analysis flow',
            action: () => router.push('/analysis'),
        },
    ]

    const fetchProjects = () => {
        return fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (data.projects) {
                    setProjects(data.projects)
                    setAnalysisSelection(prev => {
                        const next = { ...prev }
                        for (const project of data.projects as Project[]) {
                            if (next[project.id] === undefined) {
                                next[project.id] = true
                            }
                        }
                        return next
                    })
                }
            })
            .catch(err => console.error('Failed to fetch projects:', err))
    }

    const fetchConnections = () =>
        fetch('/api/user/connections')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.connections)) {
                    setConnectionsCount(data.connections.length)
                }
            })
            .catch(() => setConnectionsCount(null))

    const fetchDraftSkills = () =>
        fetch('/api/analysis-draft')
            .then(res => res.json())
            .then(data => {
                const draft = data?.draft
                const total = (draft?.skills?.length || 0) + (draft?.manualSkills?.length || 0)
                setSkillsCount(total)
            })
            .catch(() => setSkillsCount(null))

    const fetchTargetRole = () => {
        setIsRoleLoading(true)
        return fetch('/api/user/target-role')
            .then(res => res.json())
            .then(data => {
                setTargetRole(data.targetRole || null)
                setJobDescription(data.jobDescription || null)
                if (data.targetRole) {
                    setJobTitleInput(data.targetRole)
                }
            })
            .catch(err => console.error('Failed to fetch target role:', err))
            .finally(() => setIsRoleLoading(false))
    }

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            Promise.all([fetchProjects(), fetchTargetRole(), fetchConnections(), fetchDraftSkills()]).finally(() => setIsLoading(false))
        }
    }, [status])

    useEffect(() => {
        if (status !== 'authenticated') return
        if (typeof window === 'undefined') return
        const seen = localStorage.getItem('shipcv_tour_seen')
        if (!seen) {
            setShowTour(true)
        }
    }, [status])

    const handleAnalyzeAll = async () => {
        const selectedProjects = projects.filter(project => analysisSelection[project.id] !== false)
        if (selectedProjects.length === 0) return
        setIsAnalyzing(true)
        setAnalysisProgress({ total: selectedProjects.length, current: 0, failed: 0 })
        try {
            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
            const batchSize = 3
            const cooldownSeconds = 20
            let failedCount = 0

            for (let start = 0; start < selectedProjects.length; start += batchSize) {
                const batch = selectedProjects.slice(start, start + batchSize)
                const res = await fetch('/api/projects/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectIds: batch.map(project => project.id) })
                })
                if (!res.ok) {
                    failedCount += batch.length
                } else {
                    const data = await res.json()
                    if (Array.isArray(data.results)) {
                        failedCount += data.results.filter((item: any) => item?.success === false).length
                    }
                }
                setAnalysisProgress((prev) => ({
                    total: selectedProjects.length,
                    current: Math.min((prev?.current || 0) + batch.length, selectedProjects.length),
                    failed: failedCount
                }))

                if (start + batchSize < selectedProjects.length) {
                    setAnalysisCooldown(cooldownSeconds)
                    for (let i = cooldownSeconds; i > 0; i -= 1) {
                        await sleep(1000)
                        setAnalysisCooldown(i - 1)
                    }
                }
            }

            await fetchProjects()
            if (failedCount > 0) {
                setAnalysisMessage(`Analysis complete with ${failedCount} failed project${failedCount === 1 ? '' : 's'}.`)
            } else {
                setAnalysisMessage('Analysis complete! All selected projects are scored.')
            }
        } catch (error) {
            console.error('Analysis error:', error)
            setAnalysisMessage('Analysis failed. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleAutoSelect = async () => {
        setIsAutoSelecting(true)
        try {
            const res = await fetch('/api/projects/auto-select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 3 })
            })
            if (res.ok) {
                await fetchProjects()
                alert('Top projects auto-selected!')
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to auto-select')
            }
        } catch (error) {
            console.error('Auto-select error:', error)
        } finally {
            setIsAutoSelecting(false)
        }
    }

    const extractRoleFromDescription = (description: string): string => {
        const firstLine = description.split('\n')[0]
        return firstLine.substring(0, 100).trim() || 'Target Role'
    }

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault()
        setRoleError('')
        setIsSavingRole(true)

        try {
            const computedRole = roleMode === 'title'
                ? jobTitleInput.trim()
                : extractRoleFromDescription(jobDescriptionInput)

            if (!computedRole) {
                setRoleError('Please provide a role or job description.')
                setIsSavingRole(false)
                return
            }

            const response = await fetch('/api/user/target-role', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetRole: computedRole,
                    jobDescription: roleMode === 'description' ? jobDescriptionInput : null,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                setTargetRole(result.targetRole || computedRole)
                setJobDescription(result.jobDescription || null)
                await update({
                    targetRole: result.targetRole || computedRole,
                    jobDescription: result.jobDescription || null,
                } as any)
            } else {
                setRoleError(result.error || 'Failed to update target role')
            }
        } catch (error) {
            console.error('Target role update error:', error)
            setRoleError('Failed to update target role')
        } finally {
            setIsSavingRole(false)
        }
    }

    const analyzedCount = projects.filter(p => typeof p.ai_score === 'number').length

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-2xl font-serif text-[var(--text-secondary)]">Loading...</div>
                </div>
            </div>
        )
    }

        return (
        <div className="max-w-7xl mx-auto">
            {showTour && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
                    <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-xl space-y-4">
                        <button
                            onClick={() => {
                                setShowTour(false)
                                if (tourHideNext) localStorage.setItem('shipcv_tour_seen', 'true')
                            }}
                            className="absolute top-4 right-4 rounded-full p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-warm)] transition-colors"
                            aria-label="Close tour"
                        >
                            <MdClose className="text-lg" />
                        </button>
                        <div>
                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">
                                Getting Started
                            </div>
                            <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)]">
                                {tourSteps[tourStep]?.title}
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-2">
                                {tourSteps[tourStep]?.body}
                            </p>
                            <button
                                onClick={() => {
                                    tourSteps[tourStep]?.action?.()
                                }}
                                className="mt-3 text-sm font-semibold text-[var(--orange-primary)] hover:underline"
                            >
                                {tourSteps[tourStep]?.cta}
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <input
                                    type="checkbox"
                                    checked={tourHideNext}
                                    onChange={(e) => setTourHideNext(e.target.checked)}
                                />
                                Don’t show this again
                            </label>
                            <button
                                onClick={() => {
                                    const next = tourStep + 1
                                    if (next >= tourSteps.length) {
                                        setShowTour(false)
                                        localStorage.setItem('shipcv_tour_seen', 'true')
                                        return
                                    }
                                    setTourStep(next)
                                }}
                                className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-sm font-semibold"
                            >
                                {tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">
                    Welcome back, {session?.user?.name}!
                </h1>
                <p className="text-[var(--text-secondary)] text-lg">
                    {projects.length > 0
                        ? `You have ${projects.length} ${projects.length === 1 ? 'project' : 'projects'} synced from your connected platforms.`
                        : 'Your profile is being synced from your connected platforms.'}
                </p>
            </div>

            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm mb-8">
                {(() => {
                    const hasConnections = (connectionsCount ?? 0) > 0
                    const hasProjects = projects.length > 0
                    const hasTargetRole = Boolean(targetRole)
                    const analyzedCount = projects.filter(p => typeof p.ai_score === 'number').length
                    const hasAnalysis = analyzedCount > 0
                    const hasSkills = (skillsCount ?? 0) > 0

                    const steps = [
                        {
                            key: 'connections',
                            title: 'Connect platforms',
                            detail: hasConnections ? `${connectionsCount} connected` : 'Add GitHub/others in Settings',
                            done: hasConnections,
                            action: () => router.push('/settings'),
                        },
                        {
                            key: 'projects',
                            title: 'Sync projects',
                            detail: hasProjects ? `${projects.length} projects imported` : 'Sync to pull your repos/posts/etc',
                            done: hasProjects,
                            action: () => router.push('/settings'),
                        },
                        {
                            key: 'role',
                            title: 'Set a target role',
                            detail: hasTargetRole ? targetRole : 'This tailors scoring + bullets',
                            done: hasTargetRole,
                            action: () => {
                                const el = document.getElementById('target-role-card')
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            },
                        },
                        {
                            key: 'analysis',
                            title: 'Analyze projects',
                            detail: hasAnalysis ? `${analyzedCount} scored` : 'Get AI scores + bullets',
                            done: hasAnalysis,
                            action: () => {
                                const el = document.getElementById('ai-curation-section')
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                } else {
                                    router.push('/analysis')
                                }
                            },
                        },
                        {
                            key: 'skills',
                            title: 'Review skills & projects',
                            detail: hasSkills ? `${skillsCount} skills selected` : 'Refine skills and project selection',
                            done: hasSkills,
                            action: () => router.push('/analysis'),
                        },
                    ]

                    const next =
                        steps.find(step => !step.done) || steps[steps.length - 1]

                    return (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">
                                        Resume Setup
                                    </div>
                                    <h2 className="text-2xl font-serif font-semibold text-[var(--text-primary)] mt-1">
                                        One clear path to a great resume
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                                        Follow the steps below to finish your resume.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {steps.map((step) => (
                                    <button
                                        key={step.key}
                                        type="button"
                                        onClick={step.action}
                                        className="text-left rounded-xl border border-[var(--border-light)] bg-[var(--bg-warm)] px-4 py-3 hover:bg-[var(--orange-light)] transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {step.done ? (
                                                    <MdCheckCircle className="text-xl text-[var(--github-green)]" />
                                                ) : (
                                                    <MdRadioButtonUnchecked className="text-xl text-[var(--text-secondary)]" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-[var(--text-primary)]">
                                                    {step.title}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                                                    {step.detail}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )
                })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div id="target-role-card" className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">Target Role</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">Set the role you want and tune AI scoring.</p>
                            </div>
                            {isRoleLoading ? (
                                <span className="text-xs text-[var(--text-secondary)]">Loading…</span>
                            ) : (
                                <span className="inline-flex items-center text-xs px-3 py-1 rounded-full border border-[var(--border-light)] bg-[var(--bg-warm)] text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                    {targetRole ? 'Active' : 'Not set'}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setRoleMode('title')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${roleMode === 'title'
                                        ? 'bg-[var(--orange-primary)] text-white'
                                        : 'bg-[var(--bg-warm)] border border-[var(--border-light)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                Job Title
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleMode('description')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${roleMode === 'description'
                                        ? 'bg-[var(--orange-primary)] text-white'
                                        : 'bg-[var(--bg-warm)] border border-[var(--border-light)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                Job Description
                            </button>
                        </div>

                        <form onSubmit={handleSaveRole} className="space-y-4">
                            {roleError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {roleError}
                                </div>
                            )}

                            {roleMode === 'title' ? (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Job Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={jobTitleInput}
                                        onChange={(e) => setJobTitleInput(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                                        placeholder="e.g., Backend Engineer, ML Engineer"
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                                        Provide a role title and we will generate a tailored description.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Job Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        value={jobDescriptionInput}
                                        onChange={(e) => setJobDescriptionInput(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)] min-h-[160px] font-mono text-sm"
                                        placeholder="Paste the full job description here..."
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                                        We will extract the role and use this for AI scoring.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSavingRole}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] transition-colors disabled:opacity-50"
                            >
                                {isSavingRole ? 'Saving...' : 'Save Target Role'}
                            </button>
                        </form>

                        {targetRole && (
                            <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] p-4 text-sm">
                                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-1">
                                    Current Role
                                </div>
                                <div className="font-semibold text-[var(--text-primary)]">{targetRole}</div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <h3 className="text-lg font-serif font-semibold mb-2">Role Snapshot</h3>
                        {jobDescription?.summary ? (
                            <>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    {jobDescription.summary}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {jobDescription.requiredSkills && jobDescription.requiredSkills.length > 0 && (
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                                Required Skills
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {jobDescription.requiredSkills.map((skill, i) => (
                                                    <span
                                                        key={`${skill}-${i}`}
                                                        className="px-2 py-1 text-xs rounded-full bg-[var(--orange-light)] text-[var(--text-primary)]"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {jobDescription.preferredSkills && jobDescription.preferredSkills.length > 0 && (
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                                Preferred Skills
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {jobDescription.preferredSkills.map((skill, i) => (
                                                    <span
                                                        key={`${skill}-${i}`}
                                                        className="px-2 py-1 text-xs rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-[var(--text-secondary)]"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {jobDescription.responsibilities && jobDescription.responsibilities.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                            Responsibilities
                                        </div>
                                        <ul className="text-sm text-[var(--text-secondary)] list-disc ml-5 space-y-1 marker:text-[var(--orange-primary)]">
                                            {jobDescription.responsibilities.map((item, i) => (
                                                <li key={`${item}-${i}`}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {jobDescription.tools && jobDescription.tools.length > 0 && (
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                                Tools
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {jobDescription.tools.map((tool, i) => (
                                                    <span
                                                        key={`${tool}-${i}`}
                                                        className="px-2 py-1 text-xs rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-[var(--text-secondary)]"
                                                    >
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {jobDescription.metrics && jobDescription.metrics.length > 0 && (
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                                Metrics
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {jobDescription.metrics.map((metric, i) => (
                                                    <span
                                                        key={`${metric}-${i}`}
                                                        className="px-2 py-1 text-xs rounded-full bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-secondary)]"
                                                    >
                                                        {metric}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)]">
                                Add a target role to unlock a tailored summary and skill signals for AI scoring.
                            </p>
                        )}
                    </div>

                </div>

                <div className="lg:col-span-2 space-y-6">
                    {projects.length > 0 ? (
                        <div id="ai-curation-section" className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-serif font-semibold">AI Curation</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Click a project card to exclude it from analysis.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAnalyzeAll}
                                        disabled={isAnalyzing || projects.length === 0}
                                        className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--bg-warm)] flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isAnalyzing && analysisProgress
                                            ? `Analyzing ${analysisProgress.current}/${analysisProgress.total}` 
                                            : 'Analyze Projects'}
                                    </button>
                                </div>
                            </div>
                            {isAnalyzing && analysisProgress && (
                                <div className="space-y-2">
                                    <div className="h-2 rounded-full bg-[var(--bg-warm)] overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--orange-primary)] transition-all"
                                            style={{
                                                width: `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {analysisProgress.current} of {analysisProgress.total} analyzed
                                        {analysisProgress.failed > 0 ? ` • ${analysisProgress.failed} failed` : ''}
                                    </div>
                                </div>
                            )}
                            {analysisMessage && !isAnalyzing && (
                                <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-warm)] border border-[var(--border-light)] rounded-lg px-4 py-3 flex items-center justify-between">
                                    <span>{analysisMessage}</span>
                                    <button
                                        onClick={() => setAnalysisMessage(null)}
                                        className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                            {!isAnalyzing && analyzedCount > 0 && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--bg-warm)] border border-[var(--border-light)] rounded-lg px-4 py-3">
                                    <div>
                                        <div className="font-semibold text-[var(--text-primary)]">Continue to project selection</div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                            Review analyzed projects, add/remove items, then finalize your skills.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/analysis')}
                                        className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-sm font-semibold hover:bg-[var(--orange-hover)]"
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}
                            {analysisCooldown > 0 && (
                                <div className="text-xs text-[var(--text-secondary)]">
                                    Rate limit cooldown: waiting {analysisCooldown}s before the next batch.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => {
                                            setAnalysisSelection(prev => ({
                                                ...prev,
                                                [project.id]: prev[project.id] === false,
                                            }))
                                        }}
                                        className={`bg-[var(--bg-card)] rounded-lg p-5 border shadow-sm transition-all relative cursor-pointer ${analysisSelection[project.id] === false
                                                ? 'border-[var(--border-light)] hover:shadow-md'
                                                : 'border-[var(--orange-primary)] ring-1 ring-[var(--orange-primary)] bg-[var(--orange-light)]'
                                            } ${project.is_selected ? 'outline outline-1 outline-[var(--orange-primary)]' : ''}`}
                                    >
                                        {project.is_selected && (
                                            <div className="absolute -top-2 -right-2 bg-[var(--orange-primary)] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                <span>SELECTED</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-semibold text-lg truncate flex-1 pr-2">
                                                {project.name}
                                            </h3>
                                            {project.ai_score !== null && (
                                                <div className="flex flex-col items-end">
                                                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">AI Match</div>
                                                    <div className={`text-lg font-bold leading-none ${project.ai_score >= 80 ? 'text-[var(--github-green)]' :
                                                            project.ai_score >= 50 ? 'text-[var(--orange-primary)]' :
                                                                'text-gray-400'
                                                        }`}>
                                                        {project.ai_score}%
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                            {project.description || 'No description'}
                                        </p>

                                        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-4">
                                            {project.language && (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded-full bg-[var(--github-green)]"></span>
                                                    {project.language}
                                                </span>
                                            )}
                                            {project.stars !== null && project.stars > 0 && (
                                                <span>Stars: {project.stars}</span>
                                            )}
                                            {project.forks !== null && project.forks > 0 && (
                                                <span> {project.forks}</span>
                                            )}
                                        </div>

                                        {project.ai_analysis_jsonb?.bulletPoints && (
                                            <ul className="text-[11px] text-[var(--text-secondary)] mb-4 space-y-1 list-disc pl-4 italic">
                                                {project.ai_analysis_jsonb.bulletPoints.slice(0, 2).map((point: string, i: number) => (
                                                    <li key={i}>{point}</li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="flex justify-between items-center">
                                            <a
                                                href={project.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                                className="inline-block text-xs text-[var(--orange-primary)] hover:underline font-medium"
                                            >
                                                View Repo →
                                            </a>
                                            <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold">
                                                {project.platform}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border-light)] shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--green-light)] flex items-center justify-center text-[var(--github-green)]">
                                        <MdCheckCircle className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-semibold text-lg">Onboarding Complete</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">You're all set up</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border-light)] shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--orange-light)] flex items-center justify-center text-[var(--orange-primary)]">
                                        <MdLink className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-semibold text-lg">Manage Platforms</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">Update your connections</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push('/settings')}
                                    className="inline-block px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md font-medium hover:bg-[var(--orange-hover)] transition-colors text-sm"
                                >
                                    Go to Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {projects.length === 0 && (
                        <div className="bg-[var(--bg-warm)] rounded-lg p-8 border border-[var(--border-light)]">
                            <h2 className="text-2xl font-serif font-semibold mb-4">What's Next?</h2>
                            <div className="space-y-3 text-[var(--text-secondary)]">
                                <p> Your platform data will be synced automatically</p>
                                <p> View and manage your connected platforms in Settings</p>
                                <p> Your projects will appear here once syncing is complete</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
