import type { Metadata } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const newsreader = Newsreader({
    subsets: ['latin'],
    style: ['normal', 'italic'],
    variable: '--font-newsreader'
})

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
            <body className={`${inter.variable} ${newsreader.variable} font-sans`} suppressHydrationWarning>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    )
}
