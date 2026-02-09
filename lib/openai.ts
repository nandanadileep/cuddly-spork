import OpenAI from 'openai'

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
})

export interface ProjectAnalysis {
    score: number // 0-100
    techStack: string[]
    summary: string
    strengths: string[]
    improvements: string[]
    bulletPoints: string[]
    reasoning: string
}

export interface AnalyzeProjectInput {
    name: string
    description: string | null
    language: string | null
    url: string
    stars?: number
    technologies?: string[]
    targetRole?: string
    jobKeywords?: string[]      // Keywords from cached job description
    requiredSkills?: string[]   // Required skills from cached job description
}


/**
 * Analyze a project using OpenAI and return structured analysis
 */
export async function analyzeProject(
    project: AnalyzeProjectInput
): Promise<ProjectAnalysis> {
    const prompt = buildAnalysisPrompt(project)

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert technical recruiter and software engineer. 
Analyze projects objectively and provide structured feedback for resume building.
Focus on technical depth, code quality indicators, and relevance to job roles.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1000,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error('No response from OpenAI')
        }

        const analysis = JSON.parse(content) as ProjectAnalysis

        // Validate and normalize score
        analysis.score = Math.max(0, Math.min(100, analysis.score || 0))

        // Ensure arrays exist
        analysis.techStack = analysis.techStack || []
        analysis.strengths = analysis.strengths || []
        analysis.improvements = analysis.improvements || []
        analysis.bulletPoints = analysis.bulletPoints || []

        return analysis
    } catch (error) {
        console.error('OpenAI analysis error:', error)
        throw new Error('Failed to analyze project with AI')
    }
}

/**
 * Build the analysis prompt for OpenAI
 */
function buildAnalysisPrompt(project: AnalyzeProjectInput): string {
    const parts = [
        `Analyze this software project for a developer's resume:`,
        ``,
        `**Project:** ${project.name}`,
        `**Description:** ${project.description || 'No description provided'}`,
        `**Language:** ${project.language || 'Not specified'}`,
        `**Stars:** ${project.stars || 0}`,
        `**URL:** ${project.url}`,
    ]

    if (project.technologies && project.technologies.length > 0) {
        parts.push(`**Technologies:** ${project.technologies.join(', ')}`)
    }

    if (project.targetRole) {
        parts.push(
            ``,
            `** TARGET ROLE:** ${project.targetRole}`,
            ``
        )

        // Include cached job description data for better matching
        if (project.requiredSkills && project.requiredSkills.length > 0) {
            parts.push(`**Required Skills for Role:** ${project.requiredSkills.join(', ')}`)
        }

        if (project.jobKeywords && project.jobKeywords.length > 0) {
            parts.push(`**Keywords to Match:** ${project.jobKeywords.join(', ')}`)
        }

        parts.push(
            ``,
            `IMPORTANT: Score this project based on its RELEVANCE to the target role above.`,
            `Match the project against the required skills and keywords provided.`
        )
    }

    parts.push(
        ``,
        `Provide a JSON response with this exact structure:`,
        `{`,
        `  "score": <number 0-100>,`,
        `  "techStack": [<array of technologies>],`,
        `  "summary": "<2-3 sentence summary>",`,
        `  "strengths": [<3-5 key strengths>],`,
        `  "improvements": [<2-3 suggestions>],`,
        `  "bulletPoints": [<3-5 resume bullet points>],`,
        `  "reasoning": "<brief scoring explanation>"`,
        `}`,
        ``
    )

    if (project.targetRole) {
        parts.push(
            `**Scoring criteria (JOB-TARGETED):**`,
            `- 90-100: Highly relevant to ${project.targetRole}, demonstrates required skills, production-ready`,
            `- 70-89: Relevant to role, shows applicable skills, solid implementation`,
            `- 50-69: Somewhat relevant, transferable skills, functional`,
            `- 30-49: Limited relevance to role, basic implementation`,
            `- 0-29: Not relevant to ${project.targetRole}`,
            ``,
            `Focus on:`,
            `1. How well the project's tech stack matches the role requirements`,
            `2. Whether the project demonstrates skills needed for ${project.targetRole}`,
            `3. The complexity and scale relevant to the role level`,
            project.requiredSkills?.length ? `4. Overlap with required skills: ${project.requiredSkills.slice(0, 5).join(', ')}` : ''
        )
    } else {
        parts.push(
            `**Scoring criteria (GENERAL):**`,
            `- 90-100: Production-ready, well-documented, complex`,
            `- 70-89: Solid implementation, good practices`,
            `- 50-69: Functional but basic`,
            `- 30-49: Simple/learning project`,
            `- 0-29: Minimal functionality`
        )
    }

    return parts.join('\n')
}

/**
 * Extract skills from multiple projects
 */
export async function extractSkills(
    projects: Array<{
        name: string
        description: string | null
        technologies: string[]
    }>
): Promise<string[]> {
    const prompt = `Extract a comprehensive list of technical skills from these projects. Include:
- Programming languages
- Frameworks and libraries
- Tools and platforms
- Methodologies

Projects:
${projects.map((p) => `- ${p.name}: ${p.description || 'No description'}\n  Tech: ${p.technologies.join(', ')}`).join('\n')}

Return a JSON object with a "skills" array, ordered by relevance.`

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    'You are an expert at identifying technical skills from project descriptions.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    })

    const result = JSON.parse(
        response.choices[0].message.content || '{"skills": []}'
    )
    return result.skills || []
}

export interface ResumeExtractionResult {
    contact: {
        name?: string
        email?: string
        phone?: string
        location?: string
        website?: string
        linkedin?: string
        github?: string
    }
    skills: string[]
    projects: Array<{
        name: string
        description?: string
        technologies?: string[]
        url?: string
    }>
    education: Array<{
        institution: string
        degree?: string
        field?: string
        cgpa?: string
        location?: string
        startDate?: string
        endDate?: string
        isCurrent?: boolean
        description?: string
    }>
    workExperience: Array<{
        company: string
        position: string
        location?: string
        startDate?: string
        endDate?: string
        isCurrent?: boolean
        description?: string
    }>
}

export async function extractResumeData(text: string): Promise<ResumeExtractionResult> {
    const prompt = `Extract structured resume data from the text below.

Return a JSON object with exactly these keys:
{
  "contact": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "linkedin": "",
    "github": ""
  },
  "skills": [],
  "projects": [
    { "name": "", "description": "", "technologies": [], "url": "" }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "cgpa": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "isCurrent": false,
      "description": ""
    }
  ],
  "workExperience": [
    {
      "company": "",
      "position": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "isCurrent": false,
      "description": ""
    }
  ]
}

Guidelines:
- If a field is missing, use empty string or empty array.
- Prefer concise descriptions (1-2 sentences).
- Dates should be YYYY-MM where possible, otherwise YYYY, otherwise empty string.

Resume text:
${text}
`

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: 'You are an expert resume parser that extracts structured data accurately.',
            },
            { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
        throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content) as ResumeExtractionResult

    return {
        contact: parsed.contact || {},
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience : [],
    }
}

/**
 * Detect tech stack from project metadata
 */
export function detectTechStack(project: {
    language: string | null
    description: string | null
    technologies?: string[]
}): string[] {
    const techStack = new Set<string>()

    // Add existing technologies
    if (project.technologies) {
        project.technologies.forEach((tech) => techStack.add(tech))
    }

    // Add primary language
    if (project.language) {
        techStack.add(project.language)
    }

    // Common tech keywords
    const techKeywords = [
        'React',
        'Vue',
        'Angular',
        'Next.js',
        'Node.js',
        'Express',
        'Django',
        'Flask',
        'FastAPI',
        'Spring',
        'PostgreSQL',
        'MySQL',
        'MongoDB',
        'Redis',
        'Docker',
        'Kubernetes',
        'AWS',
        'TypeScript',
        'GraphQL',
        'Tailwind',
        'Prisma',
    ]

    const searchText = (project.description || '').toLowerCase()

    techKeywords.forEach((tech) => {
        if (searchText.includes(tech.toLowerCase())) {
            techStack.add(tech)
        }
    })

    return Array.from(techStack)
}

/**
 * Calculate estimated cost for analysis
 */
export function estimateAnalysisCost(projectCount: number): number {
    // gpt-4o-mini: ~$0.0004 per project
    return Math.ceil(projectCount * 0.001) // Return in credits
}

export interface GeneratedJobDescription {
    title: string
    summary: string
    requiredSkills: string[]
    preferredSkills: string[]
    responsibilities: string[]
    tools: string[]
    metrics: string[]
    keywords: string[]
    experienceLevel: string
    industry: string[]
}

const normalizeRoleKey = (roleTitle: string) =>
    roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const ROLE_PRESETS: Record<string, GeneratedJobDescription> = {
    'sde': {
        title: 'Software Development Engineer',
        summary: 'Build and maintain scalable software systems across backend and frontend services.',
        requiredSkills: ['Data Structures', 'Algorithms', 'System Design', 'APIs', 'Git', 'Databases', 'Testing'],
        preferredSkills: ['Cloud', 'CI/CD', 'Observability', 'Caching'],
        responsibilities: [
            'Design and implement software features',
            'Write reliable tests and maintain code quality',
            'Collaborate with cross-functional teams',
            'Participate in code reviews and architecture discussions',
            'Own services end-to-end in production',
        ],
        tools: ['Git', 'CI/CD', 'Cloud Platforms', 'Monitoring'],
        metrics: ['Latency', 'Error Rate', 'Uptime', 'Deployment Frequency'],
        keywords: ['software', 'backend', 'frontend', 'scalable', 'services', 'apis', 'testing', 'design'],
        experienceLevel: 'Mid',
        industry: ['technology'],
    },
    'ai engineer': {
        title: 'AI Engineer',
        summary: 'Build AI-powered systems, integrate models, and deploy AI services into products.',
        requiredSkills: ['Machine Learning', 'Python', 'Model Deployment', 'APIs', 'Data Pipelines', 'Feature Engineering', 'Model Evaluation'],
        preferredSkills: ['LLMs', 'MLOps', 'Vector Databases', 'Prompt Engineering'],
        responsibilities: [
            'Develop and deploy AI models and services',
            'Integrate AI systems into product workflows',
            'Evaluate model performance and reliability',
            'Collaborate with product and engineering teams',
            'Automate data ingestion and model retraining',
            'Implement monitoring and alerting for AI systems',
        ],
        tools: ['PyTorch/TensorFlow', 'Docker', 'Kubernetes', 'Vector DBs'],
        metrics: ['Model Accuracy', 'Latency', 'Cost per Inference', 'Drift'],
        keywords: ['ai', 'ml', 'models', 'inference', 'deployment', 'pipelines', 'evaluation'],
        experienceLevel: 'Mid',
        industry: ['technology'],
    },
    'ml engineer': {
        title: 'Machine Learning Engineer',
        summary: 'Design and deploy ML models with robust pipelines, monitoring, and performance tuning.',
        requiredSkills: ['Machine Learning', 'Python', 'Feature Engineering', 'Model Training', 'MLOps', 'Data Pipelines', 'Model Evaluation'],
        preferredSkills: ['Kubernetes', 'Monitoring', 'Experiment Tracking', 'Distributed Training'],
        responsibilities: [
            'Build ML training and inference pipelines',
            'Optimize model performance and scalability',
            'Monitor and maintain models in production',
            'Collaborate with data and product teams',
            'Design experiments and validate model improvements',
        ],
        tools: ['MLflow', 'Airflow', 'Docker', 'Kubernetes'],
        metrics: ['AUC/Accuracy', 'Latency', 'Data Drift', 'Model Uptime'],
        keywords: ['ml', 'training', 'features', 'pipelines', 'monitoring', 'deployment'],
        experienceLevel: 'Mid',
        industry: ['technology'],
    },
    'data analyst': {
        title: 'Data Analyst',
        summary: 'Analyze data to generate insights, dashboards, and recommendations for stakeholders.',
        requiredSkills: ['SQL', 'Data Visualization', 'Statistics', 'Excel', 'Analytics', 'Data Modeling'],
        preferredSkills: ['Python', 'BI Tools', 'A/B Testing', 'Data Warehousing'],
        responsibilities: [
            'Build dashboards and reports',
            'Analyze business metrics and trends',
            'Support decision-making with insights',
            'Ensure data quality and consistency',
            'Define KPIs and reporting standards',
        ],
        tools: ['SQL', 'Tableau/Looker', 'Excel', 'Python'],
        metrics: ['Conversion Rate', 'Retention', 'Revenue Impact', 'Data Quality'],
        keywords: ['data', 'analysis', 'dashboard', 'metrics', 'insights', 'sql'],
        experienceLevel: 'Mid',
        industry: ['technology'],
    },
    'product designer': {
        title: 'Product Designer',
        summary: 'Design user-centric product experiences with strong UX and visual design craft.',
        requiredSkills: ['UX Design', 'UI Design', 'Prototyping', 'User Research', 'Design Systems', 'Interaction Design'],
        preferredSkills: ['Figma', 'Accessibility', 'Usability Testing', 'Design Ops'],
        responsibilities: [
            'Design end-to-end product flows',
            'Collaborate with product and engineering',
            'Conduct user research and testing',
            'Maintain design systems and standards',
            'Translate insights into product improvements',
        ],
        tools: ['Figma', 'FigJam', 'UserTesting', 'Design Systems'],
        metrics: ['Task Success', 'Conversion', 'Usability Score', 'Time on Task'],
        keywords: ['ux', 'ui', 'prototyping', 'research', 'design systems', 'accessibility'],
        experienceLevel: 'Mid',
        industry: ['technology'],
    },
}

const resolveRolePreset = (roleTitle: string): GeneratedJobDescription | null => {
    const normalized = normalizeRoleKey(roleTitle)

    const contains = (value: string) => normalized.includes(value)

    if (contains('sde') || contains('software development engineer') || contains('software engineer')) {
        return ROLE_PRESETS['sde']
    }
    if (contains('ai engineer') || contains('artificial intelligence engineer')) {
        return ROLE_PRESETS['ai engineer']
    }
    if (contains('ml engineer') || contains('machine learning engineer')) {
        return ROLE_PRESETS['ml engineer']
    }
    if (contains('data analyst')) {
        return ROLE_PRESETS['data analyst']
    }
    if (contains('product designer') || contains('product design')) {
        return ROLE_PRESETS['product designer']
    }

    return ROLE_PRESETS[normalized] || null
}

/**
 * Generate a detailed job description from a role title using LLM
 * This is cached in the database to avoid redundant API calls
 */
export async function generateJobDescription(
    roleTitle: string
): Promise<GeneratedJobDescription> {
    const preset = resolveRolePreset(roleTitle)
    if (preset) {
        return preset
    }

    const prompt = `Generate a detailed job description for the role: "${roleTitle}"

You are a professional HR recruiter. Based on the job title, generate a comprehensive job description that would help analyze project relevance.

Return a JSON object with the following structure:
{
    "title": "official/normalized job title",
    "summary": "2-3 sentence description of the role",
    "requiredSkills": ["skill1", "skill2", ...] // 5-10 must-have technical skills
    "preferredSkills": ["skill1", "skill2", ...] // 3-5 nice-to-have skills
    "responsibilities": ["responsibility1", ...] // 5-8 key job responsibilities
    "tools": ["tool1", "tool2", ...] // 5-8 tools/platforms/frameworks commonly used
    "metrics": ["metric1", "metric2", ...] // 4-6 metrics/KPIs used to evaluate success
    "keywords": ["keyword1", ...] // 10-15 keywords for matching projects
    "experienceLevel": "Junior/Mid/Senior/Lead/Staff/Principal",
    "industry": ["tech", "fintech", etc.] // relevant industries
}`

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert HR recruiter who creates detailed, accurate job descriptions. Always respond with valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1000,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error('No response from OpenAI')
        }

        const description = JSON.parse(content) as GeneratedJobDescription

        // Ensure arrays exist
        description.requiredSkills = description.requiredSkills || []
        description.preferredSkills = description.preferredSkills || []
        description.responsibilities = description.responsibilities || []
        description.tools = description.tools || []
        description.metrics = description.metrics || []
        description.keywords = description.keywords || []
        description.industry = description.industry || []

        return description
    } catch (error) {
        console.error('OpenAI job description error:', error)
        // Return a basic fallback
        return {
            title: roleTitle,
            summary: `Position for ${roleTitle}`,
            requiredSkills: [],
            preferredSkills: [],
            responsibilities: [],
            tools: [],
            metrics: [],
            keywords: roleTitle.toLowerCase().split(' '),
            experienceLevel: 'Mid',
            industry: ['technology'],
        }
    }
}
