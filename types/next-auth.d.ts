import 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            email: string
            name?: string | null
            targetRole?: string | null
            jobDescription?: any | null
        }
    }

    interface User {
        id: string
        email: string
        name?: string | null
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        sub: string
        targetRole?: string | null
        jobDescription?: any | null
    }
}
