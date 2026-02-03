import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
    title: 'ShipCV - Elegant Resume Builder',
    description: 'Turn your code into a professional resume.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="font-sans" suppressHydrationWarning>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    )
}
