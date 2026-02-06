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
        location?: string
        bulletPoints: string[]
    }>
    extracurriculars?: Array<{
        title: string
        organization?: string
        location?: string
        dateRange: string
        bulletPoints: string[]
    }>
    awards?: Array<{
        title: string
        issuer?: string
        date: string
        bulletPoints: string[]
    }>
    publications?: Array<{
        title: string
        venue?: string
        date: string
        url?: string | null
        bulletPoints: string[]
    }>
}

const basePreamble = `\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{textcomp}
\\pagenumbering{gobble}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{itemsep=2pt, topsep=3pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{2pt}}
\\newcommand{\\resumeItem}[1]{\\item\\small{#1}}

\\newcommand{\\resumeSubheading}[4]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small #3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{2pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small #1 & #2 \\\\
  \\end{tabular*}\\vspace{2pt}
}
`

const templateStyles: Record<TemplateId, string> = {
    modern: `
\\usepackage[default]{lato}
\\titleformat{\\section}{
  \\vspace{-2pt}\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}
`,
    classic: `
\\usepackage{mathptmx}
\\titleformat{\\section}{
  \\vspace{-2pt}\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]
\\titlespacing*{\\section}{0pt}{14pt}{6pt}
`,
    minimal: `
\\usepackage{lmodern}
\\titleformat{\\section}{
  \\vspace{-2pt}\\raggedright\\normalsize\\bfseries
}{}{0em}{}[]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}
`,
    bold: `
\\usepackage[default]{lato}
\\titleformat{\\section}{
  \\vspace{-2pt}\\raggedright\\Large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]
\\titlespacing*{\\section}{0pt}{16pt}{7pt}
`,
    compact: `
\\usepackage[default]{lato}
\\titleformat{\\section}{
  \\vspace{-2pt}\\raggedright\\normalsize\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]
\\setlist[itemize]{itemsep=1pt, topsep=2pt}
\\titlespacing*{\\section}{0pt}{10pt}{4pt}
`,
}

const normalizeLatexText = (input: string) => {
    let value = String(input ?? '')

    // Normalize common Unicode punctuation that often breaks LaTeX compilers.
    value = value
        .replace(/\u00A0/g, ' ') // nbsp
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[‐‑‒–—−]/g, '-') // hyphen/dash/minus variants
        .replace(/[•]/g, '-') // bullet
        .replace(/[·]/g, '-') // middle dot
        .replace(/…/g, '...')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')

    // Remove control chars + astral plane chars (emoji etc) that can break pdflatex.
    value = value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')

    // Strip diacritics to keep things ASCII-friendly for LaTeX.
    try {
        value = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    } catch {
        // Ignore normalization errors (very old runtimes).
    }

    return value
}

const escapeLatex = (input: string) => {
    const normalized = normalizeLatexText(input)
    const backslashToken = '__LATEX_BACKSLASH__'

    // Escape in a safe order. Backslashes become a real backslash character, not a newline command.
    return normalized
        .replace(/\\/g, backslashToken)
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\^/g, '\\^{}')
        .replace(/~/g, '\\~{}')
        .replace(new RegExp(backslashToken, 'g'), '\\textbackslash{}')
}

const normalizeUrl = (input: string) => {
    const trimmed = String(input || '').trim()
    if (!trimmed) return ''
    // If it already has a scheme (e.g. https:, http:, mailto:), keep it as-is.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed
    if (trimmed.startsWith('//')) return `https:${trimmed}`
    return `https://${trimmed}`
}

const normalizePhoneForTel = (input: string) => String(input || '').replace(/[^+\d]/g, '')

const toTitleCase = (value: string) =>
    value
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '')
        .join(' ')

const buildProjectsSection = (projects: ResumePayload['projects']) =>
    projects
        .map(project => {
            const rawBullets = Array.isArray(project.bulletPoints) ? project.bulletPoints : []
            const bulletItems = rawBullets
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
                .filter(Boolean)

            // If no bullets exist, fall back to the description so LaTeX doesn't error on an empty itemize.
            const fallbackDescription = String(project.description || '').trim()
            const bulletSource = bulletItems.length > 0
                ? bulletItems
                : (fallbackDescription ? [fallbackDescription] : [])

            const bullets = bulletSource
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const techs = Array.isArray(project.technologies)
                ? project.technologies.filter(Boolean).slice(0, 5)
                : []
            const techLine = techs.length > 0
                ? ` $|$ \\emph{${escapeLatex(techs.join(', '))}}`
                : ''
            const link = project.url
                ? `\\href{${escapeLatex(project.url)}}{\\faGithub\\ GitHub}`
                : ''
            const bulletBlock = bullets
                ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd`
                : ''
            return `\\resumeProjectHeading{\\textbf{${escapeLatex(toTitleCase(project.name))}}${techLine}}{${link}}\n${bulletBlock}\n`
        })
        .join('\n')

const buildWorkSection = (items: ResumePayload['workExperience']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : ''
            const location = item.location ? escapeLatex(item.location) : ''
            const dateRange = item.dateRange ? escapeLatex(item.dateRange) : ''
            return `\\resumeSubheading{${escapeLatex(item.company)}}{${location}}{${escapeLatex(item.position)}}{${dateRange}}\n${bulletBlock}\n`
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
            const bulletBlock = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : ''
            const dateRange = item.dateRange ? escapeLatex(item.dateRange) : ''
            const location = item.location ? escapeLatex(item.location) : ''
            return `\\resumeSubheading{${escapeLatex(item.institution)}}{${dateRange}}{${escapeLatex(item.degree)}}{${location}}\n${bulletBlock}\n`
        })
        .join('\n')
}

const buildExtracurricularSection = (items: ResumePayload['extracurriculars']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : ''
            const organization = item.organization ? escapeLatex(item.organization) : ''
            const location = item.location ? escapeLatex(item.location) : ''
            const dateRange = item.dateRange ? escapeLatex(item.dateRange) : ''
            return `\\resumeSubheading{${escapeLatex(item.title)}}{${location}}{${organization}}{${dateRange}}\n${bulletBlock}\n`
        })
        .join('\n')
}

const buildAwardsSection = (items: ResumePayload['awards']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : ''
            const issuer = item.issuer ? escapeLatex(item.issuer) : ''
            const date = item.date ? escapeLatex(item.date) : ''
            return `\\resumeSubheading{${escapeLatex(item.title)}}{${date}}{${issuer}}{}\n${bulletBlock}\n`
        })
        .join('\n')
}

const buildPublicationsSection = (items: ResumePayload['publications']) => {
    if (!items || items.length === 0) return ''
    return items
        .map(item => {
            const bullets = item.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            const bulletBlock = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : ''
            const venue = item.venue ? escapeLatex(item.venue) : ''
            const date = item.date ? escapeLatex(item.date) : ''
            const link = item.url ? `\\href{${escapeLatex(item.url)}}{Link}` : ''
            const titleLine = link
                ? `\\textbf{${escapeLatex(item.title)}} ${link}`
                : `\\textbf{${escapeLatex(item.title)}}`
            return `\\resumeSubheading{${titleLine}}{${date}}{${venue}}{}\n${bulletBlock}\n`
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

    const matches = (value: string, items: string[]) => {
        const normalized = normalize(value)
        return items.some(item => {
            const needle = normalize(item)
            if (needle.length <= 2) {
                return normalized === needle
            }
            return normalized.includes(needle)
        })
    }

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
        .map(([label, values]) => `\\textbf{${escapeLatex(label)}}{${escapeLatex(':')}} ${values.map(escapeLatex).join(', ')} \\\\`)

    if (lines.length === 0) return ''
    return `\\begin{itemize}[leftmargin=0.15in, label={}]\n\\small{\\item{\n${lines.join('\n')}\n}}\n\\end{itemize}`
}

export const renderLatexTemplate = (templateId: TemplateId, payload: ResumePayload) => {
    const contactParts: string[] = []
    if (payload.phone) {
        const tel = normalizePhoneForTel(payload.phone)
        contactParts.push(
            tel
                ? `\\href{tel:${escapeLatex(tel)}}{${escapeLatex(payload.phone)}}`
                : escapeLatex(payload.phone)
        )
    }
    if (payload.email) {
        contactParts.push(`\\href{mailto:${escapeLatex(payload.email)}}{${escapeLatex(payload.email)}}`)
    }
    if (payload.website) {
        const websiteHref = normalizeUrl(payload.website)
        contactParts.push(`\\href{${escapeLatex(websiteHref)}}{${escapeLatex(payload.website)}}`)
    }
    if (payload.linkedin) {
        contactParts.push(`\\href{${escapeLatex(payload.linkedin)}}{\\faLinkedin}`)
    }
    if (payload.github) {
        contactParts.push(`\\href{${escapeLatex(payload.github)}}{\\faGithub}`)
    }
    const contactLine = contactParts.join(' $|$ ')

    const template = `${basePreamble}
${templateStyles[templateId]}
\\begin{document}
\\begin{center}
    {\\Huge \\scshape [[.name]]}\\\\ \\vspace{2pt}
    [[.locationLine]] \\\\ \\vspace{2pt}
    \\small [[.contactLine]] \\\\
\\end{center}

[[.experienceSection]]

[[.projectsSection]]

[[.skillsSection]]

[[.educationSection]]

[[.awardsSection]]

[[.publicationsSection]]

[[.extracurricularSection]]

\\end{document}
`

    const data = {
        name: escapeLatex(payload.name),
        email: escapeLatex(payload.email),
        contactLine: contactLine || escapeLatex(payload.email),
        locationLine: payload.location ? escapeLatex(payload.location) : '\\mbox{}',
        websiteLine: '',
        targetRole: escapeLatex(payload.targetRole || 'Open to roles'),
        projectsSection: payload.projects && payload.projects.length > 0
            ? `\\section{Key Projects}\n\\resumeSubHeadingListStart\n${buildProjectsSection(payload.projects)}\\resumeSubHeadingListEnd`
            : '',
        experienceSection: payload.workExperience && payload.workExperience.length > 0
            ? `\\section{Professional Experience}\n\\resumeSubHeadingListStart\n${buildWorkSection(payload.workExperience)}\\resumeSubHeadingListEnd`
            : '',
        educationSection: payload.education && payload.education.length > 0
            ? `\\section{Education}\n\\resumeSubHeadingListStart\n${buildEducationSection(payload.education)}\\resumeSubHeadingListEnd`
            : '',
        awardsSection: payload.awards && payload.awards.length > 0
            ? `\\section{Awards}\n\\resumeSubHeadingListStart\n${buildAwardsSection(payload.awards)}\\resumeSubHeadingListEnd`
            : '',
        publicationsSection: payload.publications && payload.publications.length > 0
            ? `\\section{Publications}\n\\resumeSubHeadingListStart\n${buildPublicationsSection(payload.publications)}\\resumeSubHeadingListEnd`
            : '',
        extracurricularSection: payload.extracurriculars && payload.extracurriculars.length > 0
            ? `\\section{Extracurricular Activities}\n\\resumeSubHeadingListStart\n${buildExtracurricularSection(payload.extracurriculars)}\\resumeSubHeadingListEnd`
            : '',
        skillsSection: buildSkillsSection(payload.skills)
            ? `\\section{Technical Skills}\n${buildSkillsSection(payload.skills)}`
            : '',
    }

    return { template, data }
}
