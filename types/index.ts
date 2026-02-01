// Platform types
export type Platform =
    | 'github'
    | 'gitlab'
    | 'bitbucket'
    | 'behance'
    | 'dribbble'
    | 'codepen'
    | 'medium'
    | 'devto'

export interface PlatformProject {
    externalId: string
    name: string
    description: string | null
    url: string
    technologies: string[]
    stars?: number
    forks?: number
    language?: string
    metadata?: Record<string, any>
}

export interface AIAnalysis {
    score: number
    highlights: string[]
    bulletPoints: string[]
    reasoning: string
}

// Database types
export interface User {
    id: string
    email: string
    name: string | null
    openai_credits: number
    target_role: string | null
}

export interface Project {
    id: string
    user_id: string
    platform: string
    external_id: string
    name: string
    description: string | null
    url: string
    technologies_jsonb: string[] | null
    ai_score: number | null
    ai_analysis_jsonb: AIAnalysis | null
    stars: number | null
    forks: number | null
    language: string | null
    is_selected: boolean
    created_at: Date
    updated_at: Date
}

export interface Resume {
    id: string
    user_id: string
    title: string
    target_role: string | null
    template_id: string
    latex_content: string
    pdf_url: string | null
    selected_projects_jsonb: string[] | null
    skills_jsonb: string[] | null
    created_at: Date
    updated_at: Date
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

// LaTeX Template types
export type TemplateId = 'modern' | 'classic' | 'minimal'

export interface ResumeData {
    name: string
    email: string
    phone?: string
    website?: string
    github?: string
    linkedin?: string
    targetRole?: string
    projects: Array<{
        name: string
        description: string
        technologies: string[]
        url: string
        bulletPoints: string[]
    }>
    skills: string[]
    education?: Array<{
        degree: string
        institution: string
        year: string
    }>
}
