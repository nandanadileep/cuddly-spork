'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import AddProjectModal from '@/components/AddProjectModal'
import TargetRoleModal from '@/components/TargetRoleModal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ProjectsPage() {
    const [analyzing, setAnalyzing] = useState(false)
    const [autoSelecting, setAutoSelecting] = useState(false)
    const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
    const [showAddModal, setShowAddModal] = useState(false)
    const [showRoleModal, setShowRoleModal] = useState(false)

    const { data, error, mutate } = useSWR('/api/projects', fetcher)
    const { data: roleData, mutate: mutateRole } = useSWR('/api/user/target-role', fetcher)

    const projects = data?.projects || []
    const hasProjects = projects.length > 0

    const handleAnalyze = async () => {
        // Get only projects that haven't been analyzed yet
        const unanalyzedProjects = projects.filter((p: any) => p.ai_score === null)

        if (unanalyzedProjects.length === 0) {
            alert('All projects have already been analyzed!')
            return
        }

        setAnalyzing(true)

        try {
            const projectIds = unanalyzedProjects.map((p: any) => p.id)
            const response = await fetch('/api/projects/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds }),
            })

            const result = await response.json()

            if (response.ok) {
                alert(`✅ Successfully analyzed ${result.analyzed} projects!${result.skipped > 0 ? `\n\n${result.skipped} projects were already analyzed.` : ''}${result.failed > 0 ? `\n\n⚠️ ${result.failed} projects failed to analyze.` : ''}`)
                mutate()
            } else {
                alert(`❌ ${result.error}`)
            }
        } catch (error) {
            alert('Failed to analyze projects')
        } finally {
            setAnalyzing(false)
        }
    }

    const toggleSelection = async (projectId: string, currentlySelected: boolean) => {
        try {
            const response = await fetch('/api/projects', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    is_selected: !currentlySelected,
                }),
            })

            if (response.ok) {
                mutate()
            }
        } catch (error) {
            alert('Failed to update project')
        }
    }

    const handleAutoSelect = async () => {
        setAutoSelecting(true)
        try {
            const response = await fetch('/api/projects/auto-select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minScore: 50, maxProjects: 6 }),
            })

            const result = await response.json()

            if (response.ok && result.success) {
                alert(`🤖 ${result.message}`)
                mutate()
            } else {
                alert(`❌ ${result.message || result.error || 'Failed to auto-select projects'}`)
            }
        } catch (error) {
            alert('Failed to auto-select projects')
        } finally {
            setAutoSelecting(false)
        }
    }

    const getScoreColor = (score: number | null) => {
        if (!score) return 'var(--text-secondary)'
        if (score >= 80) return 'var(--github-green)'
        if (score >= 60) return 'var(--orange-primary)'
        return 'var(--text-secondary)'
    }

    const getScoreBadge = (score: number | null) => {
        if (!score) return null
        if (score >= 90) return '🔥 Top Pick'
        if (score >= 75) return '✨ Strong'
        return null
    }

    if (!hasProjects) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold mb-2">Your Projects</h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        View and manage all your imported projects
                    </p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-12 border border-[var(--border-light)] text-center">
                    <div className="text-8xl mb-6">📦</div>
                    <h2 className="text-2xl font-bold mb-3">No projects yet</h2>
                    <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                        Connect your platforms to automatically import your projects.
                        Our AI will analyze and score them for you.
                    </p>
                    <Link
                        href="/platforms"
                        className="inline-flex items-center gap-2 bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                    >
                        Connect Platforms
                        <span>→</span>
                    </Link>
                </div>
            </div>
        )
    }


    const analyzedCount = projects.filter((p: any) => p.ai_score !== null).length
    const selectedCount = projects.filter((p: any) => p.is_selected).length

    return (
        <div>
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold mb-2">Your Projects</h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        {projects.length} projects imported • {analyzedCount} analyzed • {selectedCount} selected
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[var(--bg-card)] border-2 border-[var(--orange-primary)] text-[var(--orange-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-primary)] hover:text-white transition-all"
                    >
                        ➕ Add Project
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || analyzedCount === projects.length}
                        className="bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {analyzing ? '🤖 Analyzing...' : '✨ Analyze with AI'}
                    </button>
                </div>
            </div>

            {/* Target Role Banner */}
            {roleData?.targetRole ? (
                <div className="mb-6 bg-gradient-to-r from-[var(--orange-primary)]/10 to-[var(--github-green)]/10 border border-[var(--orange-primary)]/30 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🎯</span>
                            <h3 className="font-bold text-lg">Analyzing for:</h3>
                        </div>
                        <p className="text-xl font-semibold text-[var(--orange-primary)]">
                            {roleData.targetRole}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRoleModal(true)}
                        className="px-4 py-2 rounded-lg border border-[var(--orange-primary)] text-[var(--orange-primary)] font-semibold hover:bg-[var(--orange-primary)] hover:text-white transition-all"
                    >
                        Change Role
                    </button>
                </div>
            ) : (
                <div className="mb-6 bg-[var(--bg-warm)] border border-[var(--border-light)] rounded-2xl p-6 text-center">
                    <p className="text-[var(--text-secondary)] mb-4">
                        💡 Set a target role to get job-specific project analysis
                    </p>
                    <button
                        onClick={() => setShowRoleModal(true)}
                        className="bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                    >
                        🎯 Set Target Role
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects
                    .sort((a: any, b: any) => (b.ai_score || 0) - (a.ai_score || 0))
                    .map((project: any) => {
                        const badge = getScoreBadge(project.ai_score)
                        const technologies = (project.technologies_jsonb as string[]) || []

                        return (
                            <div
                                key={project.id}
                                className={`bg-[var(--bg-card)] rounded-2xl p-6 border-2 transition-all ${project.is_selected
                                    ? 'border-[var(--github-green)] bg-[var(--green-light)]'
                                    : 'border-[var(--border-light)] hover:border-[var(--orange-primary)]'
                                    }`}
                            >
                                {badge && (
                                    <div className="mb-3">
                                        <span className="px-3 py-1 bg-[var(--orange-primary)] text-white text-xs font-semibold rounded-full">
                                            {badge}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-3xl">📦</div>
                                    <div className="flex items-center gap-2">
                                        {project.stars !== null && (
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                ⭐ {project.stars}
                                            </span>
                                        )}
                                        <input
                                            type="checkbox"
                                            checked={project.is_selected}
                                            onChange={() => toggleSelection(project.id, project.is_selected)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                    {project.description || 'No description'}
                                </p>

                                {technologies.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {technologies.slice(0, 3).map((tech, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-[var(--bg-warm)] text-xs font-medium rounded-full border border-[var(--border-light)]"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                        {technologies.length > 3 && (
                                            <span className="px-2 py-1 text-xs text-[var(--text-secondary)]">
                                                +{technologies.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {project.ai_score !== null && (
                                    <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                                AI Impact Score
                                            </span>
                                            <span
                                                className="text-lg font-bold"
                                                style={{ color: getScoreColor(project.ai_score) }}
                                            >
                                                {project.ai_score}/100
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-warm)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${project.ai_score}%`,
                                                    background: `linear-gradient(90deg, var(--github-green), var(--orange-primary))`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!project.ai_score && (
                                    <div className="mt-4 pt-4 border-t border-[var(--border-light)] text-center">
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            Not analyzed yet
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>

            <AddProjectModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => mutate()}
            />

            <TargetRoleModal
                isOpen={showRoleModal}
                onClose={() => setShowRoleModal(false)}
                onSuccess={() => {
                    mutateRole()
                    mutate() // Refresh projects to show updated analysis
                }}
                currentRole={roleData?.targetRole}
            />
        </div>
    )
}
