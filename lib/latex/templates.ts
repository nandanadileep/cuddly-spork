export type TemplateId = 'modern' | 'classic' | 'minimal' | 'bold' | 'compact'

export interface ResumePayload {
    name: string
    email: string
    targetRole?: string | null
    projects: Array<{
        name: string
        description: string
        bulletPoints: string[]
        technologies?: string[]
    }>
    skills: string[]
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

const buildProjectsSection = (projects: ResumePayload['projects']) =>
    projects
        .map(project => {
            const bullets = project.bulletPoints
                .map(point => `\\item ${escapeLatex(point)}`)
                .join('\n')
            return `\\textbf{${escapeLatex(project.name)}}\\\\\n${escapeLatex(project.description)}\n\\begin{itemize}\n${bullets}\n\\end{itemize}\n`
        })
        .join('\n')

export const renderLatexTemplate = (templateId: TemplateId, payload: ResumePayload) => {
    const template = `${basePreamble}
${templateStyles[templateId]}
\\begin{document}
\\begin{center}
    {\\LARGE \\textbf{[[.name]]}}\\\\
    \\vspace{4pt}
    [[.email]]
\\end{center}

\\section*{Target Role}
[[.targetRole]]

\\section*{Projects}
[[.projectsSection]]

\\section*{Skills}
[[.skillsLine]]

\\end{document}
`

    const data = {
        name: escapeLatex(payload.name),
        email: escapeLatex(payload.email),
        targetRole: escapeLatex(payload.targetRole || 'Open to roles'),
        projectsSection: buildProjectsSection(payload.projects),
        skillsLine: payload.skills.map(skill => escapeLatex(skill)).join(', '),
    }

    return { template, data }
}
