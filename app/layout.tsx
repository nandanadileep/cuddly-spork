import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://shipcv.nandanadileep.com'),
    title: 'ShipCV - ATS Resume Builder',
    description: 'Turn your projects into an ATS-friendly resume.',
    icons: {
        icon: [
            { url: '/favicon.ico', type: 'image/x-icon' },
            { url: '/favicon.png', type: 'image/png' },
            { url: '/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/favicon.png' }],
    },
    openGraph: {
        title: 'ShipCV - ATS Resume Builder',
        description: 'Turn your projects into an ATS-friendly resume.',
        images: ['/og.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ShipCV - ATS Resume Builder',
        description: 'Turn your projects into an ATS-friendly resume.',
        images: ['/og.png'],
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
                <Analytics />
            </body>
        </html>
    )
}
