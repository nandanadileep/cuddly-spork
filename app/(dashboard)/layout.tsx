'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MdInsights, MdOutlineDescription, MdPersonOutline, MdSettings, MdSpaceDashboard } from 'react-icons/md'

interface Project {
    id: string
    ai_score: number | null
    ai_analysis_jsonb: any
}

interface NextStep {
    title: string
    body: string
    href: string
    cta: string
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session, status } = useSession()
    const pathname = usePathname()
    const [nextStep, setNextStep] = useState<NextStep | null>(null)
    const [nextStepLoading, setNextStepLoading] = useState(true)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: MdSpaceDashboard },
        { name: 'Analysis', href: '/analysis', icon: MdInsights },
        { name: 'Builder', href: '/builder', icon: MdOutlineDescription },
        { name: 'Profile', href: '/profile', icon: MdPersonOutline },
        { name: 'Settings', href: '/settings', icon: MdSettings },
    ]

    useEffect(() => {
        if (status !== 'authenticated') return
        let cancelled = false

        const loadNextStep = async () => {
            setNextStepLoading(true)
            try {
                const [profileRes, connectionsRes, projectsRes, draftRes, quotaRes] = await Promise.allSettled([
                    fetch('/api/profile/me'),
                    fetch('/api/user/connections'),
                    fetch('/api/projects'),
                    fetch('/api/analysis-draft'),
                    fetch('/api/resume/quota'),
                ])

                const profile = profileRes.status === 'fulfilled' && profileRes.value.ok
                    ? await profileRes.value.json().catch(() => null)
                    : null

                const connectionsData = connectionsRes.status === 'fulfilled' && connectionsRes.value.ok
                    ? await connectionsRes.value.json().catch(() => null)
                    : null

                const projectsData = projectsRes.status === 'fulfilled' && projectsRes.value.ok
                    ? await projectsRes.value.json().catch(() => null)
                    : null

                const draftData = draftRes.status === 'fulfilled' && draftRes.value.ok
                    ? await draftRes.value.json().catch(() => null)
                    : null

                const quotaData = quotaRes.status === 'fulfilled' && quotaRes.value.ok
                    ? await quotaRes.value.json().catch(() => null)
                    : null

                if (cancelled) return

                const connections = Array.isArray(connectionsData?.connections) ? connectionsData.connections : []
                const projects: Project[] = Array.isArray(projectsData?.projects) ? projectsData.projects : []

                const draft = draftData?.draft || null
                const manualProjects = Array.isArray(draft?.manualProjects) ? draft.manualProjects : []
                const selectedProjectIds = Array.isArray(draft?.selectedProjectIds) ? draft.selectedProjectIds : []
                const skills = Array.isArray(draft?.skills) ? draft.skills : []
                const manualSkills = Array.isArray(draft?.manualSkills) ? draft.manualSkills : []

                const totalProjects = projects.length + manualProjects.length
                const targetRole = profile?.target_role || null
                const onboardingCompleted = profile?.onboarding_completed !== false

                const selectedApiProjects = projects.filter((project) => selectedProjectIds.includes(project.id))
                const analyzedCount = selectedApiProjects.filter((project) => project.ai_score !== null || project.ai_analysis_jsonb).length

                let next: NextStep | null = null

                if (!onboardingCompleted) {
                    next = {
                        title: 'Finish onboarding',
                        body: 'Complete your basic setup so ShipCV can tailor the resume.',
                        href: '/onboarding',
                        cta: 'Continue onboarding',
                    }
                } else if (connections.length === 0) {
                    next = {
                        title: 'Connect your platforms',
                        body: 'Add GitHub, GitLab, Kaggle, or other sources to pull your work.',
                        href: '/settings',
                        cta: 'Connect platforms',
                    }
                } else if (totalProjects === 0) {
                    next = {
                        title: 'Add projects',
                        body: 'Select projects from your platforms or add them manually.',
                        href: '/analysis',
                        cta: 'Add projects',
                    }
                } else if (!targetRole) {
                    next = {
                        title: 'Set your target role',
                        body: 'This lets us score projects and prioritize skills for the job you want.',
                        href: '/dashboard#target-role-card',
                        cta: 'Set target role',
                    }
                } else if (selectedProjectIds.length === 0) {
                    next = {
                        title: 'Select projects to analyze',
                        body: 'Pick which projects should be scored and highlighted.',
                        href: '/analysis',
                        cta: 'Select projects',
                    }
                } else if (selectedApiProjects.length > analyzedCount) {
                    next = {
                        title: 'Analyze selected projects',
                        body: 'Run AI scoring so we can generate bullet points and rankings.',
                        href: '/analysis',
                        cta: 'Analyze now',
                    }
                } else if (skills.length + manualSkills.length === 0) {
                    next = {
                        title: 'Review skills',
                        body: 'Confirm the skill list that will appear on your resume.',
                        href: '/analysis',
                        cta: 'Review skills',
                    }
                } else if ((quotaData?.count ?? 0) === 0) {
                    next = {
                        title: 'Build your resume',
                        body: 'Generate your resume, refine bullets, and download PDF or DOCX.',
                        href: '/builder',
                        cta: 'Open builder',
                    }
                } else {
                    next = {
                        title: 'You’re all set',
                        body: 'Refine your resume or download a new format anytime.',
                        href: '/builder',
                        cta: 'Open builder',
                    }
                }

                setNextStep(next)
            } catch (error) {
                console.error('Failed to load next step:', error)
            } finally {
                if (!cancelled) setNextStepLoading(false)
            }
        }

        loadNextStep()

        return () => {
            cancelled = true
        }
    }, [status, pathname])

    return (
        <div className="min-h-screen bg-[var(--bg-light)]">
            {/* Navigation Bar */}
            <nav className="bg-[var(--bg-card)] border-b border-[var(--border-light)] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-10">
                            <Link href="/dashboard" className="flex items-center gap-2 group">
                                <span className="text-2xl group-hover:scale-110 transition-transform"></span>
                                <span className="text-xl font-serif font-bold tracking-tight text-[var(--text-primary)]">ShipCV</span>
                            </Link>

                            {/* Navigation Links */}
                            <div className="hidden md:flex items-center gap-6">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                                ? 'text-[var(--orange-primary)]'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                }`}
                                        >
                                            <item.icon className="text-lg" />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-6">

                            <div className="h-6 w-px bg-[var(--border-light)]" />

                            <div className="flex items-center gap-4">
                                <div className="text-sm text-right hidden sm:block">
                                    <div className="font-medium text-[var(--text-primary)]">{session?.user?.name || 'User'}</div>
                                    <div className="text-[var(--text-secondary)] text-xs">{session?.user?.email}</div>
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="px-4 py-2 rounded-md border border-[var(--border-light)] hover:bg-[var(--bg-warm)] transition-colors text-sm font-medium text-[var(--text-secondary)] hidden sm:inline-flex"
                                >
                                    Sign Out
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileNavOpen((prev) => !prev)}
                                    className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                                    aria-label="Toggle navigation"
                                    aria-expanded={mobileNavOpen}
                                >
                                    {mobileNavOpen ? 'Close' : 'Menu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {mobileNavOpen && (
                    <div className="md:hidden border-t border-[var(--border-light)] bg-[var(--bg-card)]">
                        <div className="px-4 py-4 space-y-3">
                            <div className="text-sm">
                                <div className="font-medium text-[var(--text-primary)]">{session?.user?.name || 'User'}</div>
                                <div className="text-[var(--text-secondary)] text-xs">{session?.user?.email}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMobileNavOpen(false)}
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${isActive
                                                ? 'border-[var(--orange-primary)] text-[var(--orange-primary)]'
                                                : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                }`}
                                        >
                                            <item.icon className="text-lg" />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] hover:bg-[var(--bg-warm)] transition-colors text-sm font-medium text-[var(--text-secondary)]"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!nextStepLoading && nextStep && (
                    <div className="mb-6 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] font-semibold mb-1">
                                Next Step
                            </div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">{nextStep.title}</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">{nextStep.body}</div>
                        </div>
                        <Link
                            href={nextStep.href}
                            className="w-full md:w-auto text-center px-5 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-sm font-semibold hover:bg-[var(--orange-hover)] transition-colors"
                        >
                            {nextStep.cta}
                        </Link>
                    </div>
                )}
                {children}
            </main>
        </div>
    )
}
