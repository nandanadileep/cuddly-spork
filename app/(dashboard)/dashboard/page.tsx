'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
    const [roleMode, setRoleMode] = useState<'title' | 'description'>('title')
    const [jobTitleInput, setJobTitleInput] = useState('')
    const [jobDescriptionInput, setJobDescriptionInput] = useState('')
    const [targetRole, setTargetRole] = useState<string | null>(null)
    const [jobDescription, setJobDescription] = useState<JobDescriptionData | null>(null)
    const [isSavingRole, setIsSavingRole] = useState(false)
    const [roleError, setRoleError] = useState('')

    const fetchProjects = () => {
        return fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (data.projects) {
                    setProjects(data.projects)
                }
            })
            .catch(err => console.error('Failed to fetch projects:', err))
    }

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
            Promise.all([fetchProjects(), fetchTargetRole()]).finally(() => setIsLoading(false))
        }
    }, [status])

    const handleAnalyzeAll = async () => {
        if (projects.length === 0) return
        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/projects/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: projects.map(p => p.id) })
            })
            if (res.ok) {
                await fetchProjects()
                alert('Analysis complete!')
            }
        } catch (error) {
            console.error('Analysis error:', error)
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">Target Role</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">Set the role you want and tune AI scoring.</p>
                            </div>
                            {isRoleLoading ? (
                                <span className="text-xs text-[var(--text-secondary)]">Loading…</span>
                            ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-warm)] text-[var(--text-secondary)]">
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
                                {jobDescription.requiredSkills && jobDescription.requiredSkills.length > 0 && (
                                    <div className="mb-4">
                                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                            Required Skills
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {jobDescription.requiredSkills.slice(0, 8).map((skill, i) => (
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
                                {jobDescription.keywords && jobDescription.keywords.length > 0 && (
                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                            Keywords
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {jobDescription.keywords.slice(0, 8).map((keyword, i) => (
                                                <span
                                                    key={`${keyword}-${i}`}
                                                    className="px-2 py-1 text-xs rounded-full bg-[var(--bg-warm)] text-[var(--text-secondary)] border border-[var(--border-light)]"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)]">
                                Add a target role to unlock a tailored summary and skill signals for AI scoring.
                            </p>
                        )}
                    </div>

                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <h3 className="text-lg font-serif font-semibold mb-2">Next Steps</h3>
                        <div className="text-sm text-[var(--text-secondary)] space-y-2">
                            <p>1. Set a target role to guide AI scoring.</p>
                            <p>2. Analyze projects to get relevance scores.</p>
                            <p>3. Auto-select your top 5-7 projects.</p>
                        </div>
                        <button
                            onClick={() => router.push('/analysis')}
                            className="mt-4 w-full px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                        >
                            Start AI Analysis Flow
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {projects.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-serif font-semibold">AI Curation</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Let AI find the best projects for your resume.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAnalyzeAll}
                                        disabled={isAnalyzing || projects.length === 0}
                                        className="px-4 py-2 bg-white border border-[var(--border-light)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze Projects'} ✨
                                    </button>
                                    <button
                                        onClick={handleAutoSelect}
                                        disabled={isAutoSelecting || projects.length === 0}
                                        className="px-4 py-2 bg-[var(--orange-primary)] text-white rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isAutoSelecting ? 'Selecting...' : 'Auto-Select Best'} 🎯
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        className={`bg-[var(--bg-card)] rounded-lg p-5 border shadow-sm transition-all relative ${project.is_selected
                                                ? 'border-[var(--orange-primary)] ring-1 ring-[var(--orange-primary)]'
                                                : 'border-[var(--border-light)] hover:shadow-md'
                                            }`}
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
                                                <span>⭐ {project.stars}</span>
                                            )}
                                            {project.forks !== null && project.forks > 0 && (
                                                <span>🔀 {project.forks}</span>
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
                                <p>🔄 Your platform data will be synced automatically</p>
                                <p>📊 View and manage your connected platforms in Settings</p>
                                <p>🚀 Your projects will appear here once syncing is complete</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
