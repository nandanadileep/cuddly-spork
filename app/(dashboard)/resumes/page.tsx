'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Resume {
    id: string
    name: string
    template: string
    created_at: string
    updated_at: string
}

interface Skills {
    languages: Array<{ name: string; count: number }>
    frameworks: Array<{ name: string; count: number }>
    databases: Array<{ name: string; count: number }>
    cloud: Array<{ name: string; count: number }>
    devops: Array<{ name: string; count: number }>
    tools: Array<{ name: string; count: number }>
    ai_ml: Array<{ name: string; count: number }>
    other: Array<{ name: string; count: number }>
}

export default function ResumesPage() {
    const [resumes, setResumes] = useState<Resume[]>([])
    const [skills, setSkills] = useState<Skills | null>(null)
    const [topSkills, setTopSkills] = useState<Array<{ name: string; count: number }>>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedProjects, setSelectedProjects] = useState(0)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch resumes
            const resumeRes = await fetch('/api/resumes/generate')
            if (resumeRes.ok) {
                const data = await resumeRes.json()
                setResumes(data.resumes || [])
            }

            // Fetch skills
            const skillsRes = await fetch('/api/skills/aggregate')
            if (skillsRes.ok) {
                const data = await skillsRes.json()
                setSkills(data.skills)
                setTopSkills(data.topSkills || [])
                setSelectedProjects(data.selectedProjects || 0)
            }
        } catch (err) {
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    const generateResume = async () => {
        setGenerating(true)
        setError(null)

        try {
            const res = await fetch('/api/resumes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `Resume ${new Date().toLocaleDateString()}` }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Failed to generate resume')
                return
            }

            // Redirect to resume editor
            window.location.href = `/resumes/${data.resume.id}`
        } catch (err) {
            setError('Failed to generate resume')
        } finally {
            setGenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--orange-primary)]"></div>
            </div>
        )
    }

    const hasSelectedProjects = selectedProjects > 0
    const hasSkills = topSkills.length > 0

    return (
        <div>
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold mb-2">Your Resumes</h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        Generate AI-powered resumes from your projects
                    </p>
                </div>
                <button
                    onClick={generateResume}
                    disabled={generating || !hasSelectedProjects}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${hasSelectedProjects
                            ? 'bg-[var(--orange-primary)] text-white hover:bg-[var(--orange-hover)]'
                            : 'bg-[var(--bg-warm)] text-[var(--text-secondary)] cursor-not-allowed'
                        }`}
                >
                    {generating ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Generating...
                        </span>
                    ) : (
                        '+ Generate Resume'
                    )}
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Skills Preview */}
            {hasSkills && (
                <div className="mb-8 bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)]">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>🎯</span> Your Skills (from {selectedProjects} selected projects)
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {topSkills.slice(0, 15).map((skill, index) => (
                            <span
                                key={skill.name}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium ${index < 5
                                        ? 'bg-[var(--orange-primary)] text-white'
                                        : index < 10
                                            ? 'bg-[var(--github-green)] text-white'
                                            : 'bg-[var(--bg-warm)] text-[var(--text-primary)]'
                                    }`}
                            >
                                {skill.name}
                                <span className="ml-1 opacity-75">({skill.count})</span>
                            </span>
                        ))}
                    </div>

                    {/* Category breakdown */}
                    {skills && (
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {skills.languages.length > 0 && (
                                <div className="bg-[var(--bg-warm)] rounded-lg p-3">
                                    <h3 className="font-semibold text-sm mb-2">💻 Languages</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {skills.languages.slice(0, 5).map(s => s.name).join(', ')}
                                    </p>
                                </div>
                            )}
                            {skills.frameworks.length > 0 && (
                                <div className="bg-[var(--bg-warm)] rounded-lg p-3">
                                    <h3 className="font-semibold text-sm mb-2">🛠️ Frameworks</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {skills.frameworks.slice(0, 5).map(s => s.name).join(', ')}
                                    </p>
                                </div>
                            )}
                            {skills.databases.length > 0 && (
                                <div className="bg-[var(--bg-warm)] rounded-lg p-3">
                                    <h3 className="font-semibold text-sm mb-2">🗄️ Databases</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {skills.databases.slice(0, 5).map(s => s.name).join(', ')}
                                    </p>
                                </div>
                            )}
                            {skills.cloud.length > 0 && (
                                <div className="bg-[var(--bg-warm)] rounded-lg p-3">
                                    <h3 className="font-semibold text-sm mb-2">☁️ Cloud</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {skills.cloud.slice(0, 5).map(s => s.name).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Existing Resumes */}
            {resumes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resumes.map((resume) => (
                        <Link
                            key={resume.id}
                            href={`/resumes/${resume.id}`}
                            className="bg-[var(--bg-card)] rounded-2xl p-6 border-2 border-[var(--border-light)] hover:border-[var(--orange-primary)] transition-all group"
                        >
                            <div className="text-4xl mb-4">📄</div>
                            <h3 className="font-bold text-lg mb-2 group-hover:text-[var(--orange-primary)] transition-colors">
                                {resume.name}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Created {new Date(resume.created_at).toLocaleDateString()}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <span className="px-2 py-1 bg-[var(--bg-warm)] rounded text-xs">
                                    {resume.template}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="bg-[var(--bg-card)] rounded-2xl p-12 border border-[var(--border-light)] text-center">
                    <div className="text-8xl mb-6">📄</div>
                    <h2 className="text-2xl font-bold mb-3">No resumes yet</h2>
                    <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                        {hasSelectedProjects
                            ? 'You have projects ready! Click "Generate Resume" to create your AI-powered resume.'
                            : 'First, go to Projects and select the ones you want on your resume.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        {hasSelectedProjects ? (
                            <button
                                onClick={generateResume}
                                disabled={generating}
                                className="inline-flex items-center gap-2 bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                            >
                                {generating ? 'Generating...' : '✨ Generate Resume'}
                            </button>
                        ) : (
                            <Link
                                href="/projects"
                                className="inline-flex items-center gap-2 bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                            >
                                Select Projects
                                <span>→</span>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
