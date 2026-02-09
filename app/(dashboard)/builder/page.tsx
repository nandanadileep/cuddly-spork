'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MdCheckCircle, MdCode, MdErrorOutline, MdFolder, MdPersonOutline, MdSchool, MdWorkOutline } from 'react-icons/md'

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

interface ResumePreview {
    user: {
        name: string | null
        email: string
        phone: string | null
        location: string | null
        website: string | null
        linkedinUrl: string | null
        targetRole: string | null
    }
    counts: {
        education: number
        experience: number
        extracurriculars: number
        awards: number
        publications: number
    }
    links: {
        githubUrl: string | null
    }
}

type ResumeGenerationError = {
    message: string
    details?: string
    hint?: string
}

export default function ResumeBuilderPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [draft, setDraft] = useState<AnalysisDraft | null>(null)
    const [manualProjects, setManualProjects] = useState<ManualProject[]>([])
    const [projectBullets, setProjectBullets] = useState<Record<string, string[]>>({})
    const [templateId, setTemplateId] = useState('modern')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
    const [isDownloadingDoc, setIsDownloadingDoc] = useState(false)
    const [latexContent, setLatexContent] = useState('')
    const [latexDraft, setLatexDraft] = useState('')
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [quota, setQuota] = useState<{ count: number; limit: number; remaining: number } | null>(null)
    const [resumePreview, setResumePreview] = useState<ResumePreview | null>(null)

    const isHistoryClearAllowed = (session?.user?.email || '').trim().toLowerCase() === 'nandanadileep2002@gmail.com'

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

    const fetchResumePreview = () =>
        fetch('/api/resume/preview')
            .then(res => res.json())
            .then(data => {
                if (data?.success) {
                    setResumePreview({
                        user: data.user,
                        counts: data.counts,
                        links: data.links,
                    })
                }
            })
            .catch(err => console.error('Failed to fetch resume preview:', err))

    const clearResumeHistory = async () => {
        if (!confirm('Clear your resume generation history? This will reset your generation quota.')) return
        try {
            const res = await fetch('/api/resume/history', { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(data.error || 'Failed to clear history')
                return
            }
            fetchQuota()
        } catch (error) {
            console.error('Failed to clear resume history:', error)
            alert('Failed to clear history')
        }
    }

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
                fetchResumePreview(),
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

    const [generateError, setGenerateError] = useState<ResumeGenerationError | null>(null)

    const handleGenerate = async () => {
        if (!draft) return
        setIsGenerating(true)
        setPdfUrl(null)
        setGenerateError(null)
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
            } else {
                setGenerateError({
                    message: data.error || 'Failed to generate resume',
                    details: data.details || undefined,
                    hint: data.hint || undefined,
                })
            }
        } catch (error) {
            console.error('Resume generation error:', error)
            setGenerateError({ message: 'Failed to generate resume' })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!draft) return
        setGenerateError(null)
        setIsDownloadingPdf(true)
        try {
            await saveDraft()
            const res = await fetch('/api/resume/export-pdf', {
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
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setGenerateError({
                    message: data.error || 'Failed to download PDF',
                    details: data.details || undefined,
                    hint: data.hint || undefined,
                })
                return
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `resume-${new Date().toISOString().slice(0, 10)}.pdf`
            a.click()
            URL.revokeObjectURL(url)
            fetchQuota()
        } catch (error) {
            console.error('PDF export error:', error)
            setGenerateError({ message: 'Failed to download PDF' })
        } finally {
            setIsDownloadingPdf(false)
        }
    }

    const handleDownloadDoc = async () => {
        if (!draft) return
        setGenerateError(null)
        setIsDownloadingDoc(true)
        try {
            await saveDraft()
            const res = await fetch('/api/resume/export-doc', {
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
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setGenerateError({
                    message: data.error || 'Failed to download DOC',
                    details: data.details || undefined,
                    hint: data.hint || undefined,
                })
                return
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `resume-${new Date().toISOString().slice(0, 10)}.docx`
            a.click()
            URL.revokeObjectURL(url)
            fetchQuota()
        } catch (error) {
            console.error('DOC export error:', error)
            setGenerateError({ message: 'Failed to download DOC' })
        } finally {
            setIsDownloadingDoc(false)
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

            {draft && (
                <div className="sticky top-20 z-40">
                    <div className="bg-[var(--bg-card)]/95 backdrop-blur rounded-2xl p-4 border border-[var(--border-light)] shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                                        Quick Actions
                                    </div>
                                    {quota !== null && (
                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                            Generations: {quota.count} of {quota.limit} used
                                        </div>
                                    )}
                                </div>
                                {quota !== null && quota.count > 0 && isHistoryClearAllowed && (
                                    <button
                                        type="button"
                                        onClick={clearResumeHistory}
                                        className="text-xs font-semibold text-[var(--orange-primary)] hover:underline"
                                    >
                                        Clear history
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || (quota !== null && quota.remaining <= 0)}
                                    className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Preview'}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadPdf}
                                        disabled={isDownloadingPdf}
                                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDownloadingPdf ? 'PDF...' : 'Download PDF'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadDoc}
                                        disabled={isDownloadingDoc}
                                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDownloadingDoc ? 'DOC...' : 'Download DOCX'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {generateError && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                <div className="font-semibold">{generateError.message}</div>
                                {generateError.details && (
                                    <div className="text-xs text-red-700 mt-1">{generateError.details}</div>
                                )}
                                {generateError.hint && (
                                    <div className="text-xs text-red-700 mt-1">{generateError.hint}</div>
                                )}
                            </div>
                        )}
                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 block text-center px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                            >
                                Open Preview PDF
                            </a>
                        )}
                    </div>
                </div>
            )}

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
                                    <h2 className="text-xl font-serif font-semibold mb-2">Resume Contents</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Before you download, review what will appear in your resume.
                                    </p>
                                </div>

                                {(() => {
                                    const selectedProjectsCount = draft.selectedProjectIds.length + manualProjects.length
                                    const skillsCount = (draft.skills || []).length + (draft.manualSkills || []).length

                                    if (!resumePreview) {
                                        return (
                                            <div className="pt-2 flex items-center justify-between gap-3">
                                                <div className="text-sm text-[var(--text-secondary)]">Loading profile sections...</div>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchResumePreview()}
                                                    className="px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                        )
                                    }

                                    const missingContact: string[] = []
                                    if (!resumePreview?.user?.name) missingContact.push('name')
                                    if (!resumePreview?.user?.phone) missingContact.push('phone')
                                    if (!resumePreview?.user?.location) missingContact.push('location')
                                    if (!resumePreview?.user?.website) missingContact.push('website')
                                    if (!resumePreview?.user?.linkedinUrl) missingContact.push('LinkedIn')
                                    if (!resumePreview?.links?.githubUrl) missingContact.push('GitHub')

                                    const rows = [
                                        {
                                            key: 'contact',
                                            label: 'Contact info',
                                            icon: MdPersonOutline,
                                            ok: missingContact.length === 0,
                                            detail: missingContact.length ? `Missing: ${missingContact.join(', ')}` : 'Looks good',
                                        },
                                        {
                                            key: 'experience',
                                            label: 'Work experience',
                                            icon: MdWorkOutline,
                                            ok: (resumePreview?.counts?.experience || 0) > 0,
                                            detail: `${resumePreview?.counts?.experience || 0} entries`,
                                        },
                                        {
                                            key: 'education',
                                            label: 'Education',
                                            icon: MdSchool,
                                            ok: (resumePreview?.counts?.education || 0) > 0,
                                            detail: `${resumePreview?.counts?.education || 0} entries`,
                                        },
                                        {
                                            key: 'projects',
                                            label: 'Projects',
                                            icon: MdFolder,
                                            ok: selectedProjectsCount > 0,
                                            detail: `${selectedProjectsCount} selected`,
                                        },
                                        {
                                            key: 'skills',
                                            label: 'Skills',
                                            icon: MdCode,
                                            ok: skillsCount > 0,
                                            detail: `${skillsCount} listed`,
                                        },
                                    ]

                                    return (
                                        <>
                                            <div className="space-y-3">
                                                {rows.map((row) => (
                                                    <div key={row.key} className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <row.icon className="text-xl text-[var(--text-secondary)] mt-0.5" />
                                                            <div>
                                                                <div className="font-semibold text-[var(--text-primary)]">{row.label}</div>
                                                                <div className="text-xs text-[var(--text-secondary)]">{row.detail}</div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-0.5">
                                                            {row.ok ? (
                                                                <MdCheckCircle className="text-xl text-[var(--github-green)]" />
                                                            ) : (
                                                                <MdErrorOutline className="text-xl text-[var(--orange-primary)]" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 border-t border-[var(--border-light)] flex flex-col sm:flex-row gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/profile')}
                                                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                                >
                                                    Edit Profile (Education/Work)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchResumePreview()}
                                                    className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm space-y-4">
                                <div>
                                    <h2 className="text-xl font-serif font-semibold mb-2">Preview & Export</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Use the Quick Actions bar above to generate and download. If you need to tweak formatting, edit the LaTeX below and re-compile.
                                    </p>
                                </div>

                                {!latexContent && (
                                    <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-warm)] border border-[var(--border-light)] rounded-lg px-4 py-3">
                                        No preview generated yet. Click <span className="font-semibold">Generate Preview</span> in Quick Actions.
                                    </div>
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
                                            } else if (!res.ok) {
                                                setGenerateError({
                                                    message: data.error || 'Failed to compile LaTeX',
                                                    details: data.details || undefined,
                                                    hint: data.hint || undefined,
                                                })
                                            }
                                        }}
                                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                    >
                                        Compile Edited LaTeX (Preview Only)
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
