import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
    title: 'ShipCV - ATS Resume Builder',
    description: 'Land more interviews.',
    icons: {
        icon: '/favicon.svg',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const themeScript = `
        (function() {
            try {
                var stored = localStorage.getItem('shipcv_theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.style.colorScheme = theme;
            } catch (e) {}
        })();
    `

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="font-sans" suppressHydrationWarning>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    )
}
