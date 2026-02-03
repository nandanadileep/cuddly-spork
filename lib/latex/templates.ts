export type TemplateId = 'modern' | 'classic' | 'minimal' | 'bold' | 'compact'

export interface ResumePayload {
    name: string
    email: string
    phone?: string | null
    location?: string | null
    linkedin?: string | null
    website?: string | null
    github?: string | null
    targetRole?: string | null
    projects: Array<{
        name: string
        description: string
        bulletPoints: string[]
        technologies?: string[]
        url?: string | null
    }>
    skills: string[]
    workExperience?: Array<{
        company: string
        position: string
        dateRange: string
        location?: string
        bulletPoints: string[]
    }>
    education?: Array<{
        institution: string
        degree: string
        dateRange: string
        bulletPoints: string[]
    }>
}

const basePreamble = `\\documentclass[11pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\setlist[itemize]{noitemsep, topsep=2pt}
\\pagenumbering{gobble}
`

const templateStyles: Record<TemplateId, string> = {
    modern: `
\\usepackage{titlesec}
\\titleformat{\\section}{\\large\\bfseries}{ }{0pt}{}[\\vspace{2pt}\\hrule]
\\titlespacing*{\\section}{0pt}{10pt}{4pt}
`,
    classic: `
\\usepackage{titlesec}
\\titleformat{\\section}{\\large\\scshape}{ }{0pt}{}[\\vspace{4pt}]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}
`,
    minimal: `
\\usepackage{titlesec}
\\titleformat{\\section}{\\normalsize\\bfseries}{ }{0pt}{}[\\vspace{2pt}]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}
`,
    bold: `
\\usepackage{titlesec}
\\titleformat{\\section}{\\Large\\bfseries}{ }{0pt}{}[\\vspace{2pt}\\hrule]
\\titlespacing*{\\section}{0pt}{14pt}{6pt}
`,
    compact: `
\\usepackage{titlesec}
\\titleformat{\\section}{\\normalsize\\bfseries}{ }{0pt}{}[\\vspace{1pt}\\hrule]
\\titlespacing*{\\section}{0pt}{6pt}{2pt}
\\setlist[itemize]{noitemsep, topsep=1pt}
`,
}

const escapeLatex = (input: string) =>
    input
        .replace(/\\/g, '\\\\')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\^/g, '\\^{}')
        .replace(/~/g, '\\~{}')

const toTitleCase = (value: string) =>
    value
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '')
        .join(' ')

const buildProjectsSection = (projects: ResumePayload['projects']) =>
    projects
        .map(project => {
            const bullets = project.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const descriptionLine = project.description ? `${escapeLatex(project.description)}\n` : ''
            const link = project.url ? `\\href{${escapeLatex(project.url)}}{GitHub Link}` : ''
            const header = link
                ? `\\textbf{${escapeLatex(toTitleCase(project.name))}} \\hfill ${link}`
                : `\\textbf{${escapeLatex(toTitleCase(project.name))}}`
            return `${header}\\\\\n${descriptionLine}\\begin{itemize}\n${bullets}\n\\end{itemize}\n`
        })
        .join('\n')

const buildWorkSection = (items: ResumePayload['workExperience']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\begin{itemize}\n${bullets}\n\\end{itemize}` : ''
            const location = item.location ? ` — ${escapeLatex(item.location)}` : ''
            return `\\textbf{${escapeLatex(item.position)}} — ${escapeLatex(item.company)}${location} \\hfill ${escapeLatex(item.dateRange)}\n${bulletBlock}\n`
        })
        .join('\n')
}

const buildEducationSection = (items: ResumePayload['education']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\begin{itemize}\n${bullets}\n\\end{itemize}` : ''
            return `\\textbf{${escapeLatex(item.degree)}} --- ${escapeLatex(item.institution)} \\hfill ${escapeLatex(item.dateRange)}\n${bulletBlock}\n`
        })
        .join('\n')
}

const buildSkillsSection = (skills: string[]) => {
    const buckets: Record<string, string[]> = {
        'Languages': [],
        'ML/AI Frameworks': [],
        'Backend & Cloud': [],
        'Tools & Technologies': [],
        'Frontend': [],
        'Other': [],
    }

    const normalize = (value: string) => value.toLowerCase()

    const matches = (value: string, items: string[]) =>
        items.some(item => normalize(value).includes(normalize(item)))

    const languageKeywords = [
        'python', 'c++', 'c#', 'c', 'java', 'javascript', 'typescript', 'sql', 'go', 'rust', 'swift', 'kotlin', 'r'
    ]
    const mlKeywords = [
        'pytorch', 'tensorflow', 'hugging face', 'transformers', 'langchain', 'faiss', 'fastembed', 'peft',
        'lora', 'qlora', 'scikit', 'xgboost', 'lightgbm', 'catboost'
    ]
    const backendKeywords = [
        'fastapi', 'flask', 'django', 'spring', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
        'postgres', 'postgresql', 'redis', 'celery', 'opensearch', 's3', 'lambda', 'ecs', 'cloudwatch', 'iam', 'bedrock'
    ]
    const toolsKeywords = [
        'git', 'ci/cd', 'github actions', 'jira', 'tableau', 'gtsam', 'tree-sitter', 'nginx', 'kafka'
    ]
    const frontendKeywords = [
        'react', 'typescript', 'tailwind', 'vite', 'html', 'css', 'next'
    ]

    skills.forEach(skill => {
        if (!skill) return
        if (matches(skill, languageKeywords)) {
            buckets['Languages'].push(skill)
        } else if (matches(skill, mlKeywords)) {
            buckets['ML/AI Frameworks'].push(skill)
        } else if (matches(skill, backendKeywords)) {
            buckets['Backend & Cloud'].push(skill)
        } else if (matches(skill, toolsKeywords)) {
            buckets['Tools & Technologies'].push(skill)
        } else if (matches(skill, frontendKeywords)) {
            buckets['Frontend'].push(skill)
        } else {
            buckets['Other'].push(skill)
        }
    })

    const lines = Object.entries(buckets)
        .filter(([, values]) => values.length > 0)
        .map(([label, values]) => `\\textbf{${escapeLatex(label)}}: ${values.map(escapeLatex).join(', ')} \\\\`)

    return lines.join('\n')
}

export const renderLatexTemplate = (templateId: TemplateId, payload: ResumePayload) => {
    const contactParts: string[] = []
    if (payload.phone) {
        contactParts.push(escapeLatex(payload.phone))
    }
    if (payload.location) {
        contactParts.push(escapeLatex(payload.location))
    }
    if (payload.email) {
        contactParts.push(`\\href{mailto:${escapeLatex(payload.email)}}{${escapeLatex(payload.email)}}`)
    }
    if (payload.linkedin) {
        contactParts.push(`\\href{${escapeLatex(payload.linkedin)}}{LinkedIn}`)
    }
    if (payload.website) {
        contactParts.push(`\\href{${escapeLatex(payload.website)}}{Website}`)
    }
    if (payload.github) {
        contactParts.push(`\\href{${escapeLatex(payload.github)}}{GitHub}`)
    }
    const contactLine = contactParts.join(' \\textbullet\\ ')

    const template = `${basePreamble}
${templateStyles[templateId]}
\\begin{document}
\\begin{center}
    {\\LARGE \\textbf{[[.name]]}}\\\\
    \\vspace{4pt}
    [[.contactLine]]
\\end{center}

[[.experienceSection]]

\\section*{Projects}
[[.projectsSection]]

\\section*{Technical Skills}
[[.skillsLine]]

[[.educationSection]]

\\end{document}
`

    const data = {
        name: escapeLatex(payload.name),
        email: escapeLatex(payload.email),
        contactLine: contactLine || escapeLatex(payload.email),
        targetRole: escapeLatex(payload.targetRole || 'Open to roles'),
        projectsSection: buildProjectsSection(payload.projects),
        experienceSection: payload.workExperience && payload.workExperience.length > 0
            ? `\\section*{Professional Experience}\n${buildWorkSection(payload.workExperience)}`
            : '',
        educationSection: payload.education && payload.education.length > 0
            ? `\\section*{Education}\n${buildEducationSection(payload.education)}`
            : '',
        skillsLine: buildSkillsSection(payload.skills),
    }

    return { template, data }
}
