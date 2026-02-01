'use client'

import { useState } from 'react'

interface ProjectCardProps {
    project: {
        id: string
        name: string
        description: string | null
        url: string
        language: string | null
        stars: number | null
        ai_score: number | null
        technologies_jsonb: string[] | null
        ai_analysis_jsonb: any
    }
    onAnalyze?: (projectId: string) => Promise<void>
}

export default function ProjectCard({ project, onAnalyze }: ProjectCardProps) {
    const [analyzing, setAnalyzing] = useState(false)

    const handleAnalyze = async () => {
        if (!onAnalyze) return
        setAnalyzing(true)
        try {
            await onAnalyze(project.id)
        } finally {
            setAnalyzing(false)
        }
    }

    const getScoreColor = (score: number | null) => {
        if (!score) return 'bg-gray-200 text-gray-600'
        if (score >= 90) return 'bg-green-100 text-green-700'
        if (score >= 70) return 'bg-blue-100 text-blue-700'
        if (score >= 50) return 'bg-yellow-100 text-yellow-700'
        return 'bg-orange-100 text-orange-700'
    }

    const techStack = project.technologies_jsonb || []

    return (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-light)] hover:shadow-lg transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                        {project.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                        {project.description || 'No description'}
                    </p>
                </div>

                {/* AI Score Badge */}
                {project.ai_score !== null && (
                    <div
                        className={`ml-4 px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(project.ai_score)}`}
                    >
                        {project.ai_score}
                    </div>
                )}
            </div>

            {/* Tech Stack */}
            {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {techStack.slice(0, 5).map((tech, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 bg-[var(--orange-light)] text-[var(--orange-primary)] text-xs rounded-md font-medium"
                        >
                            {tech}
                        </span>
                    ))}
                    {techStack.length > 5 && (
                        <span className="px-2 py-1 text-xs text-[var(--text-secondary)]">
                            +{techStack.length - 5} more
                        </span>
                    )}
                </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-4">
                {project.language && (
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[var(--github-green)]"></span>
                        {project.language}
                    </span>
                )}
                {project.stars !== null && project.stars > 0 && (
                    <span className="flex items-center gap-1">
                        ⭐ {project.stars}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--orange-primary)] hover:underline font-medium"
                >
                    View Project →
                </a>

                {onAnalyze && (
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="ml-auto px-4 py-2 bg-[var(--orange-primary)] text-white text-sm rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {analyzing ? (
                            <span className="flex items-center gap-2">
                                <svg
                                    className="animate-spin h-4 w-4"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Analyzing...
                            </span>
                        ) : project.ai_score !== null ? (
                            'Re-analyze'
                        ) : (
                            'Analyze with AI'
                        )}
                    </button>
                )}
            </div>

            {/* AI Analysis Details */}
            {project.ai_analysis_jsonb && (
                <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {project.ai_analysis_jsonb.summary}
                    </p>
                    {project.ai_analysis_jsonb.strengths && (
                        <div className="mt-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                                Key Strengths:
                            </p>
                            <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                {project.ai_analysis_jsonb.strengths
                                    .slice(0, 3)
                                    .map((strength: string, index: number) => (
                                        <li key={index}>• {strength}</li>
                                    ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
