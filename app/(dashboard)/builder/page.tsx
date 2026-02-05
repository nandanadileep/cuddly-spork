'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Project {
    id: string
    name: string
    description: string | null
    technologies_jsonb?: string[] | null
    ai_analysis_jsonb?: any
}

interface ManualProject {
    id: string
    name: string
    description: string
    technologies: string[]
    notes: string[]
}

interface AnalysisDraft {
    selectedProjectIds: string[]
    manualProjects: ManualProject[]
    projectBullets: Record<string, string[]>
    skills: string[]
    manualSkills: string[]
    templateId: string
}

export default function ResumeBuilderPage() {
    const { status } = useSession()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [draft, setDraft] = useState<AnalysisDraft | null>(null)
    const [manualProjects, setManualProjects] = useState<ManualProject[]>([])
    const [projectBullets, setProjectBullets] = useState<Record<string, string[]>>({})
    const [templateId, setTemplateId] = useState('modern')
    const [isGenerating, setIsGenerating] = useState(false)
    const [latexContent, setLatexContent] = useState('')
    const [latexDraft, setLatexDraft] = useState('')
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [quota, setQuota] = useState<{ count: number; limit: number; remaining: number } | null>(null)

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

    const fetchQuota = () =>
        fetch('/api/resume/quota')
            .then(res => res.json())
            .then(data => {
                if (data.count !== undefined) setQuota({ count: data.count, limit: data.limit, remaining: data.remaining })
            })
            .catch(() => {})

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            Promise.all([
                fetchProjects(),
                fetch('/api/analysis-draft')
                    .then(res => res.json())
                    .then(data => {
                        if (data?.draft) {
                            setDraft(data.draft)
                            setManualProjects(data.draft.manualProjects || [])
                            setProjectBullets(data.draft.projectBullets || {})
                            setTemplateId(data.draft.templateId || 'modern')
                        }
                    }),
                fetchQuota(),
            ]).finally(() => setIsLoading(false))
        }
    }, [status])

    const selectedProjects = useMemo(() => {
        if (!draft) return []
        return projects.filter(project => draft.selectedProjectIds.includes(project.id))
    }, [projects, draft])

    const resolveProjectBullets = (project: Project) => {
        if (projectBullets[project.id]) return projectBullets[project.id]
        if (project.ai_analysis_jsonb?.bulletPoints?.length) return project.ai_analysis_jsonb.bulletPoints
        return ['']
    }

    const saveDraft = async (overrides?: Partial<AnalysisDraft>) => {
        if (!draft) return
        const payload: AnalysisDraft = {
            selectedProjectIds: draft.selectedProjectIds,
            manualProjects,
            projectBullets,
            skills: draft.skills,
            manualSkills: draft.manualSkills,
            templateId,
            ...overrides,
        }

        try {
            await fetch('/api/analysis-draft', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            setDraft(payload)
        } catch (error) {
            console.error('Failed to save draft:', error)
        }
    }

    const updateProjectBullets = (projectId: string, nextBullets: string[]) => {
        const nextMap = { ...projectBullets, [projectId]: nextBullets }
        setProjectBullets(nextMap)
        saveDraft({ projectBullets: nextMap })
    }

    const updateManualProjectNotes = (projectId: string, nextNotes: string[]) => {
        const nextManual = manualProjects.map(project => (
            project.id === projectId ? { ...project, notes: nextNotes } : project
        ))
        setManualProjects(nextManual)
        saveDraft({ manualProjects: nextManual })
    }

    const handleGenerate = async () => {
        if (!draft) return
        setIsGenerating(true)
        setPdfUrl(null)
        try {
            await saveDraft()
            const res = await fetch('/api/resume/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId,
                    selectedProjectIds: draft.selectedProjectIds,
                    manualProjects,
                    skills: draft.skills,
                    manualSkills: draft.manualSkills,
                    projectBullets,
                }),
            })
            const data = await res.json()
            if (res.ok) {
                const latex = data.latexContent || ''
                setLatexContent(latex)
                setLatexDraft(latex)
                if (data.pdfBase64) {
                    const bytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))
                    const blob = new Blob([bytes], { type: 'application/pdf' })
                    const url = URL.createObjectURL(blob)
                    setPdfUrl(url)
                }
            }
        } catch (error) {
            console.error('Resume generation error:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const templates = [
        { id: 'modern', name: 'Modern', description: 'Clean headings with bold emphasis.' },
        { id: 'classic', name: 'Classic', description: 'Traditional serif styling.' },
        { id: 'minimal', name: 'Minimal', description: 'Compact and understated.' },
        { id: 'bold', name: 'Bold', description: 'Strong section hierarchy.' },
        { id: 'compact', name: 'Compact', description: 'Dense layout for longer resumes.' },
    ]

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
                    <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">Resume Builder</h1>
                    <p className="text-[var(--text-secondary)] text-lg">
                        We pulled the projects and skills you selected in the AI analysis flow.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/analysis')}
                    className="px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                >
                    Back to Analysis
                </button>
            </div>

            {!draft ? (
                <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                    <h2 className="text-xl font-serif font-semibold mb-2">No Draft Found</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Start the AI analysis flow to select projects and skills before building your resume.
                    </p>
                    <button
                        onClick={() => router.push('/analysis')}
                        className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                    >
                        Go to AI Analysis Flow
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <h2 className="text-xl font-serif font-semibold mb-4">Choose a Template</h2>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        setTemplateId(template.id)
                                        saveDraft({ templateId: template.id })
                                    }}
                                    className={`text-left rounded-xl border p-4 transition-all ${templateId === template.id
                                            ? 'border-[var(--orange-primary)] bg-[var(--orange-light)]'
                                            : 'border-[var(--border-light)] bg-[var(--bg-card)] hover:shadow-sm'
                                        }`}
                                >
                                    <div className="font-semibold text-[var(--text-primary)]">{template.name}</div>
                                    <div className="text-xs text-[var(--text-secondary)]">{template.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm space-y-6">
                            <div>
                                <h2 className="text-xl font-serif font-semibold mb-2">Project Bullets</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Edit bullet points and reorder them for the final resume.
                                </p>
                            </div>

                            {selectedProjects.length === 0 && manualProjects.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No projects selected yet.</p>
                            ) : (
                                <div className="space-y-5">
                                    {selectedProjects.map(project => {
                                        const bullets = resolveProjectBullets(project)
                                        return (
                                            <div key={project.id} className="border border-[var(--border-light)] rounded-xl p-4 space-y-3">
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                                    <div className="text-xs text-[var(--text-secondary)] line-clamp-2">
                                                        {project.description || 'No description'}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {bullets.map((bullet: string, index: number) => (
                                                        <div key={`${project.id}-${index}`} className="flex items-start gap-2">
                                                            <input
                                                                value={bullet}
                                                                onChange={(e) => {
                                                                    const next = [...bullets]
                                                                    next[index] = e.target.value
                                                                    updateProjectBullets(project.id, next)
                                                                }}
                                                                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] text-sm"
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        if (index === 0) return
                                                                        const next = [...bullets]
                                                                        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                                                                        updateProjectBullets(project.id, next)
                                                                    }}
                                                                    className="px-2 py-1 text-xs rounded border border-[var(--border-light)]"
                                                                >
                                                                    ↑
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (index === bullets.length - 1) return
                                                                        const next = [...bullets]
                                                                        ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                                                                        updateProjectBullets(project.id, next)
                                                                    }}
                                                                    className="px-2 py-1 text-xs rounded border border-[var(--border-light)]"
                                                                >
                                                                    ↓
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const next = bullets.filter((_: string, i: number) => i !== index)
                                                                        updateProjectBullets(project.id, next.length ? next : [''])
                                                                    }}
                                                                    className="px-2 py-1 text-xs rounded border border-[var(--border-light)] text-red-600"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => updateProjectBullets(project.id, [...bullets, ''])}
                                                        className="text-xs font-semibold text-[var(--orange-primary)]"
                                                    >
                                                        + Add bullet
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {manualProjects.map(project => (
                                        <div key={project.id} className="border border-[var(--border-light)] rounded-xl p-4 space-y-3">
                                            <div>
                                                <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                                <div className="text-xs text-[var(--text-secondary)]">{project.description}</div>
                                            </div>
                                            <div className="space-y-2">
                                                {(project.notes.length ? project.notes : ['']).map((note, index) => (
                                                    <div key={`${project.id}-${index}`} className="flex items-start gap-2">
                                                        <input
                                                            value={note}
                                                            onChange={(e) => {
                                                                const next = [...(project.notes.length ? project.notes : [''])]
                                                                next[index] = e.target.value
                                                                updateManualProjectNotes(project.id, next)
                                                            }}
                                                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] text-sm"
                                                        />
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    if (index === 0) return
                                                                    const next = [...(project.notes.length ? project.notes : [''])]
                                                                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                                                                    updateManualProjectNotes(project.id, next)
                                                                }}
                                                                className="px-2 py-1 text-xs rounded border border-[var(--border-light)]"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const source = project.notes.length ? project.notes : ['']
                                                                    if (index === source.length - 1) return
                                                                    const next = [...source]
                                                                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                                                                    updateManualProjectNotes(project.id, next)
                                                                }}
                                                                className="px-2 py-1 text-xs rounded border border-[var(--border-light)]"
                                                            >
                                                                ↓
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const source = project.notes.length ? project.notes : ['']
                                                                    const next = source.filter((_, i) => i !== index)
                                                                    updateManualProjectNotes(project.id, next.length ? next : [''])
                                                                }}
                                                                className="px-2 py-1 text-xs rounded border border-[var(--border-light)] text-red-600"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => updateManualProjectNotes(project.id, [...(project.notes.length ? project.notes : ['']), ''])}
                                                    className="text-xs font-semibold text-[var(--orange-primary)]"
                                                >
                                                    + Add bullet
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                                <h2 className="text-xl font-serif font-semibold mb-4">Skills</h2>
                                <div className="flex flex-wrap gap-2">
                                    {(draft.skills || []).map(skill => (
                                        <span
                                            key={`ai-${skill}`}
                                            className="px-3 py-1 rounded-full bg-[var(--orange-light)] text-sm text-[var(--text-primary)]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {(draft.manualSkills || []).map(skill => (
                                        <span
                                            key={`manual-${skill}`}
                                            className="px-3 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm space-y-4">
                                <div>
                                    <h2 className="text-xl font-serif font-semibold mb-2">Generate Resume</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Produce LaTeX and a downloadable PDF with your edits.
                                    </p>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                                >
                                    {isGenerating ? 'Generating...' : 'Generate LaTeX & PDF'}
                                </button>
                                {pdfUrl && (
                                    <a
                                        href={pdfUrl}
                                        download="resume.pdf"
                                        className="block text-center px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                    >
                                        Download PDF
                                    </a>
                                )}
                                {latexContent && (
                                    <textarea
                                        value={latexDraft}
                                        onChange={(e) => setLatexDraft(e.target.value)}
                                        className="w-full min-h-[200px] px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] text-xs font-mono"
                                    />
                                )}
                                {latexContent && (
                                    <button
                                        onClick={async () => {
                                            if (!latexDraft.trim()) return
                                            const res = await fetch('/api/resume/compile', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ latex: latexDraft }),
                                            })
                                            const data = await res.json()
                                            if (res.ok && data.pdfBase64) {
                                                const bytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))
                                                const blob = new Blob([bytes], { type: 'application/pdf' })
                                                const url = URL.createObjectURL(blob)
                                                setPdfUrl(url)
                                            }
                                        }}
                                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                    >
                                        Compile Edited LaTeX
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
