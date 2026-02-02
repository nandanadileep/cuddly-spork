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

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isAutoSelecting, setIsAutoSelecting] = useState(false)

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

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            fetchProjects().finally(() => setIsLoading(false))
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
        <div className="max-w-6xl mx-auto">
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

            {/* Projects Grid */}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="mt-8 bg-[var(--bg-warm)] rounded-lg p-8 border border-[var(--border-light)]">
                    <h2 className="text-2xl font-serif font-semibold mb-4">What's Next?</h2>
                    <div className="space-y-3 text-[var(--text-secondary)]">
                        <p>🔄 Your platform data will be synced automatically</p>
                        <p>📊 View and manage your connected platforms in Settings</p>
                        <p>🚀 Your projects will appear here once syncing is complete</p>
                    </div>
                </div>
            )}
        </div>
    )
}
