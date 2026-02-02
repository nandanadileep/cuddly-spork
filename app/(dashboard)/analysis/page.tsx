'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
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

interface ManualProject {
    id: string
    name: string
    description: string
    technologies: string[]
    notes: string[]
}

export default function AnalysisFlowPage() {
    const { status } = useSession()
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
    const [manualProjects, setManualProjects] = useState<ManualProject[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [skills, setSkills] = useState<string[]>([])
    const [manualSkills, setManualSkills] = useState<string[]>([])
    const [skillInput, setSkillInput] = useState('')
    const [manualProjectInput, setManualProjectInput] = useState({
        name: '',
        description: '',
        technologies: '',
    })

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

    const fetchDraft = () => {
        return fetch('/api/analysis-draft')
            .then(res => res.json())
            .then(data => {
                if (data?.draft) {
                    setSelectedProjectIds(data.draft.selectedProjectIds || [])
                    setManualProjects(data.draft.manualProjects || [])
                    setSkills(data.draft.skills || [])
                    setManualSkills(data.draft.manualSkills || [])
                }
            })
            .catch(err => console.error('Failed to fetch analysis draft:', err))
    }

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            Promise.all([fetchProjects(), fetchDraft()]).finally(() => setIsLoading(false))
        }
    }, [status])

    const toggleProjectSelection = (projectId: string) => {
        setSelectedProjectIds(prev => (
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        ))
    }

    const handleAddManualProject = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedName = manualProjectInput.name.trim()
        const trimmedDescription = manualProjectInput.description.trim()

        if (!trimmedName || !trimmedDescription) return

        const technologies = manualProjectInput.technologies
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)

        const newProject: ManualProject = {
            id: `manual-${Date.now()}`,
            name: trimmedName,
            description: trimmedDescription,
            technologies,
            notes: [],
        }

        const nextManualProjects = [...manualProjects, newProject]
        const nextSelected = [...selectedProjectIds, newProject.id]
        setManualProjects(nextManualProjects)
        setSelectedProjectIds(nextSelected)
        saveDraft({ manualProjects: nextManualProjects, selectedProjectIds: nextSelected })
        setManualProjectInput({ name: '', description: '', technologies: '' })
    }

    const saveDraft = async (overrides?: Partial<{
        selectedProjectIds: string[]
        manualProjects: ManualProject[]
        skills: string[]
        manualSkills: string[]
    }>) => {
        const payload = {
            selectedProjectIds,
            manualProjects,
            skills,
            manualSkills,
            ...overrides,
        }

        try {
            await fetch('/api/analysis-draft', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
        } catch (error) {
            console.error('Failed to save analysis draft:', error)
        }
    }

    const handleAnalyzeSelected = async () => {
        const apiProjectIds = selectedProjectIds.filter(id => !id.startsWith('manual-'))
        if (apiProjectIds.length === 0) return

        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/projects/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: apiProjectIds }),
            })

            if (res.ok) {
                await fetchProjects()
            }
        } catch (error) {
            console.error('Analysis error:', error)
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleExtractSkills = async () => {
        try {
            const res = await fetch('/api/profile/extract-skills', { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.skills) {
                setSkills(data.skills)
                await saveDraft({ skills: data.skills })
            }
        } catch (error) {
            console.error('Skill extraction error:', error)
        }
    }

    const handleAddManualSkill = () => {
        const trimmed = skillInput.trim()
        if (!trimmed) return
        if (manualSkills.includes(trimmed)) return
        const next = [...manualSkills, trimmed]
        setManualSkills(next)
        saveDraft({ manualSkills: next })
        setSkillInput('')
    }

    const combinedSelectedProjects = useMemo(() => {
        const apiProjects = projects.filter(project => selectedProjectIds.includes(project.id))
        const manual = manualProjects.filter(project => selectedProjectIds.includes(project.id))
        return { apiProjects, manual }
    }, [projects, manualProjects, selectedProjectIds])

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
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">AI Analysis Flow</h1>
                    <p className="text-[var(--text-secondary)] text-lg">
                        Move from project selection → AI analysis → curated skills with manual overrides at every step.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                >
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 1, label: 'Projects' },
                    { id: 2, label: 'AI Analysis' },
                    { id: 3, label: 'Skills' },
                ].map(item => (
                    <div
                        key={item.id}
                        className={`rounded-xl border p-4 ${step === item.id
                                ? 'bg-[var(--bg-card)] border-[var(--orange-primary)] shadow-sm'
                                : 'bg-[var(--bg-warm)] border-[var(--border-light)]'
                            }`}
                    >
                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">Step {item.id}</div>
                        <div className="text-lg font-semibold text-[var(--text-primary)]">{item.label}</div>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-serif font-semibold">Select Projects</h2>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    {selectedProjectIds.length} selected
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {projects.map(project => (
                                    <label
                                        key={project.id}
                                        className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedProjectIds.includes(project.id)
                                                ? 'border-[var(--orange-primary)] bg-[var(--orange-light)]'
                                                : 'border-[var(--border-light)] bg-[var(--bg-card)] hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedProjectIds.includes(project.id)}
                                                onChange={() => toggleProjectSelection(project.id)}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                                <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                                    {project.description || 'No description'}
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-2">Add Project Manually</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Don’t see a project? Add it here and continue through the flow.
                            </p>
                            <form onSubmit={handleAddManualProject} className="space-y-3">
                                <input
                                    type="text"
                                    value={manualProjectInput.name}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Project name"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                    required
                                />
                                <textarea
                                    value={manualProjectInput.description}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Project description"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[100px]"
                                    required
                                />
                                <input
                                    type="text"
                                    value={manualProjectInput.technologies}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, technologies: e.target.value }))}
                                    placeholder="Technologies (comma-separated)"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                />
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                                >
                                    Add Manual Project
                                </button>
                            </form>
                        </div>

                        {manualProjects.length > 0 && (
                            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                                <h3 className="text-lg font-serif font-semibold mb-2">Manual Projects</h3>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                    {manualProjects.map(project => (
                                        <div key={project.id} className="border border-[var(--border-light)] rounded-lg p-3">
                                            <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                            <div className="text-xs">{project.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 flex justify-end">
                        <button
                            onClick={async () => {
                                await saveDraft()
                                setStep(2)
                            }}
                            disabled={selectedProjectIds.length === 0}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                        >
                            Continue to AI Analysis
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">AI Analysis</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Run AI scoring on selected projects or add your own highlights.
                                </p>
                            </div>
                            <button
                                onClick={handleAnalyzeSelected}
                                disabled={isAnalyzing || combinedSelectedProjects.apiProjects.length === 0}
                                className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Selected Projects'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {combinedSelectedProjects.apiProjects.map(project => (
                            <div
                                key={project.id}
                                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{project.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                            {project.description || 'No description'}
                                        </p>
                                    </div>
                                    {project.ai_score !== null && (
                                        <div className="text-right">
                                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">AI Match</div>
                                            <div className="text-2xl font-bold text-[var(--orange-primary)]">{project.ai_score}%</div>
                                        </div>
                                    )}
                                </div>
                                {project.ai_analysis_jsonb?.bulletPoints && (
                                    <ul className="mt-4 text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-1">
                                        {project.ai_analysis_jsonb.bulletPoints.slice(0, 3).map((bullet: string, i: number) => (
                                            <li key={i}>{bullet}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}

                        {combinedSelectedProjects.manual.map(project => (
                            <div
                                key={project.id}
                                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm"
                            >
                                <h3 className="text-lg font-semibold">{project.name}</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">{project.description}</p>
                                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                    Manual Highlights
                                </div>
                                <textarea
                                    value={project.notes.join('\n')}
                                    onChange={(e) => {
                                        const updatedNotes = e.target.value.split('\n').filter(Boolean)
                                        const next = manualProjects.map(p => (
                                            p.id === project.id ? { ...p, notes: updatedNotes } : p
                                        ))
                                        setManualProjects(next)
                                        saveDraft({ manualProjects: next })
                                    }}
                                    placeholder="Add bullet points (one per line)"
                                    className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] text-sm"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                        >
                            Back to Projects
                        </button>
                        <button
                            onClick={async () => {
                                await saveDraft()
                                setStep(3)
                            }}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                        >
                            Continue to Skills
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">Skills</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Pull skills from your profile or add them manually.
                                </p>
                            </div>
                            <button
                                onClick={handleExtractSkills}
                                className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                            >
                                Extract Skills with AI
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-3">AI Suggested Skills</h3>
                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map(skill => (
                                        <span
                                            key={skill}
                                            className="px-3 py-1 rounded-full bg-[var(--orange-light)] text-sm text-[var(--text-primary)]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Run extraction to populate skills from your projects and experience.
                                </p>
                            )}
                        </div>

                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-3">Manual Skills</h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    placeholder="Add a skill"
                                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                />
                                <button
                                    onClick={handleAddManualSkill}
                                    className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                                >
                                    Add
                                </button>
                            </div>
                            {manualSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {manualSkills.map(skill => (
                                        <button
                                            key={skill}
                                            onClick={() => {
                                                const next = manualSkills.filter(item => item !== skill)
                                                setManualSkills(next)
                                                saveDraft({ manualSkills: next })
                                            }}
                                            className="px-3 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)] hover:bg-[var(--orange-light)]"
                                        >
                                            {skill} ×
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Add any skills that should appear on your resume.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(2)}
                            className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                        >
                            Back to Analysis
                        </button>
                        <button
                            onClick={async () => {
                                await saveDraft()
                                router.push('/builder')
                            }}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                        >
                            Continue to Resume Builder
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
