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
    const [isLoading, setIsLoading] = useState(true)

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
                <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                    <h2 className="text-xl font-serif font-semibold mb-2">Draft Loaded</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {selectedProjects.length} selected projects and {draft.manualProjects.length} manual projects are ready.
                    </p>
                </div>
            )}
        </div>
    )
}
