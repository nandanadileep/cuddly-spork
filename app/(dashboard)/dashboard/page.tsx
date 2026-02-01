'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'
import ProjectCard from '@/components/ProjectCard'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
    const { data: session } = useSession()
    const { data: platformsData } = useSWR('/api/platforms', fetcher)
    const { data: projectsData, mutate: mutateProjects } = useSWR(
        '/api/projects',
        fetcher
    )
    const [analyzing, setAnalyzing] = useState<string | null>(null)

    const platformsCount = platformsData?.connections?.length || 0
    const projectsCount = projectsData?.projects?.length || 0
    const resumesCount = 0 // TODO: Implement resumes API

    const handleAnalyzeProject = async (projectId: string) => {
        setAnalyzing(projectId)
        try {
            const response = await fetch(`/api/projects/${projectId}/analyze`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                alert(error.error || 'Failed to analyze project')
                return
            }

            const result = await response.json()

            // Refresh projects data
            mutateProjects()

            alert(
                `Project analyzed! Score: ${result.analysis.score}/100\nCredits remaining: ${result.creditsRemaining}`
            )
        } catch (error) {
            console.error('Analysis error:', error)
            alert('Failed to analyze project')
        } finally {
            setAnalyzing(null)
        }
    }

    const quickActions = [
        {
            title: 'Connect Platforms',
            description: 'Link your GitHub, GitLab, and other accounts',
            href: '/platforms',
            icon: '🔗',
            color: 'orange',
        },
        {
            title: 'View Projects',
            description: 'See all your imported projects',
            href: '/projects',
            icon: '📦',
            color: 'green',
        },
        {
            title: 'Create Resume',
            description: 'Generate a new AI-powered resume',
            href: '/resumes/new',
            icon: '✨',
            color: 'orange',
        },
    ]

    return (
        <div>
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold mb-2">
                    Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
                </h1>
                <p className="text-lg text-[var(--text-secondary)]">
                    Let's build your perfect resume from your amazing projects
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)]">
                    <div className="text-3xl mb-2">🔗</div>
                    <div className="text-3xl font-extrabold text-[var(--orange-primary)]">
                        {platformsCount}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] font-medium">
                        Platforms Connected
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)]">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="text-3xl font-extrabold text-[var(--github-green)]">
                        {projectsCount}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] font-medium">
                        Projects Imported
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)]">
                    <div className="text-3xl mb-2">📄</div>
                    <div className="text-3xl font-extrabold text-[var(--orange-primary)]">
                        {resumesCount}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] font-medium">
                        Resumes Created
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {quickActions.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className="bg-[var(--bg-card)] rounded-2xl p-6 border-2 border-[var(--border-light)] hover:border-[var(--orange-primary)] transition-all hover:scale-105 hover:shadow-lg"
                        >
                            <div className="text-4xl mb-3">{action.icon}</div>
                            <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{action.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Getting Started Guide */}
            {platformsCount === 0 && (
                <div className="bg-gradient-to-br from-[var(--orange-light)] to-[var(--bg-card)] rounded-2xl p-8 border border-[var(--orange-primary)]">
                    <h2 className="text-2xl font-bold mb-4">🚀 Getting Started</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--orange-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">
                                1
                            </div>
                            <div>
                                <h3 className="font-semibold">Connect your platforms</h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Link GitHub, GitLab, Behance, and other accounts to import your projects
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--orange-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">
                                2
                            </div>
                            <div>
                                <h3 className="font-semibold">Let AI analyze your work</h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Our AI will score and rank your projects based on quality and relevance
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--orange-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">
                                3
                            </div>
                            <div>
                                <h3 className="font-semibold">Generate your resume</h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Create a beautiful LaTeX resume with AI-optimized bullet points
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/platforms"
                        className="mt-6 inline-flex items-center gap-2 bg-[var(--orange-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                    >
                        Start Connecting Platforms
                        <span>→</span>
                    </Link>
                </div>
            )}

            {/* Recent Projects with AI Analysis */}
            {projectsCount > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Your Projects</h2>
                        <Link
                            href="/projects"
                            className="text-[var(--orange-primary)] font-semibold hover:underline"
                        >
                            View all →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projectsData?.projects?.slice(0, 6).map((project: any) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onAnalyze={handleAnalyzeProject}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
