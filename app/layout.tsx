import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
    title: 'ShipCV - ATS Resume Builder',
    description: 'Fill the form to get an ATS-winning resume.',
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
