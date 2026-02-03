'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AnalysisDraft {
    selectedProjectIds: string[]
    manualProjects: any[]
    skills: string[]
    manualSkills: string[]
}

export default function ResumeBuilderPage() {
    const { status } = useSession()
    const router = useRouter()
    const [draft, setDraft] = useState<AnalysisDraft | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            fetch('/api/analysis-draft')
                .then(res => res.json())
                .then(data => setDraft(data?.draft || null))
                .finally(() => setIsLoading(false))
        }
    }, [status])

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
                        Continue to edit bullet points and pick a template.
                    </p>
                </div>
            )}
        </div>
    )
}
