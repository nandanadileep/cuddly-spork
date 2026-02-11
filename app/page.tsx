import ThemeToggle from '@/components/ThemeToggle'

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="fixed top-4 right-4 z-40">
                <ThemeToggle />
            </div>
            <div className="max-w-4xl mx-auto text-center">
                <div className="mb-6">
                    <span className="inline-block bg-[var(--orange-light)] text-[var(--orange-primary)] px-6 py-2 rounded-full text-sm font-semibold">
                    </span>
                </div>

                <h1 className="text-6xl font-extrabold mb-6 leading-tight">
                    Turn your projects into an
                    <br />
                    <span className="text-[var(--orange-primary)]">ATS-friendly resume</span>
                </h1>

                <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
                    Connect your GitHub, GitLab, Behance, and more. Let AI curate your best work and generate a stunning resume.
                </p>

                <div className="flex gap-4 justify-center">
                    <a
                        href="/signup"
                        className="bg-[var(--orange-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--orange-hover)] transition-all hover:scale-105 hover:shadow-lg inline-flex items-center gap-2"
                    >
                        Get Started Free
                        <span>→</span>
                    </a>
                    <a
                        href="/login"
                        className="bg-[var(--bg-warm)] text-[var(--text-primary)] px-8 py-4 rounded-xl font-semibold text-lg border-2 border-[var(--border-light)] hover:border-[var(--orange-primary)] transition-all hover:scale-105"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        </div>
    )
}
