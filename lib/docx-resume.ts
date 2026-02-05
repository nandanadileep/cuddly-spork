import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    HeadingLevel,
    convertInchesToTwip,
} from 'docx'
import type { ResumePayload } from '@/lib/latex/templates'

function bulletParagraph(text: string): Paragraph {
    return new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text, size: 22 })],
        spacing: { after: 100 },
    })
}

function sectionHeading(text: string): Paragraph {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        thematicBreak: true,
        spacing: { before: 240, after: 120 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 28,
            }),
        ],
    })
}

export async function buildDocxResume(payload: ResumePayload): Promise<Buffer> {
    const contactParts: string[] = []
    if (payload.email) contactParts.push(payload.email)
    if (payload.phone) contactParts.push(payload.phone)
    if (payload.location) contactParts.push(payload.location)
    if (payload.website) contactParts.push(payload.website)
    if (payload.linkedin) contactParts.push(payload.linkedin)
    if (payload.github) contactParts.push(payload.github)
    const contactLine = contactParts.join(' | ')

    const children: Paragraph[] = []

    // Header
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: payload.name,
                    bold: true,
                    size: 48,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({
                    text: payload.targetRole || 'Open to roles',
                    italics: true,
                    size: 24,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
                new TextRun({
                    text: contactLine || payload.email,
                    size: 22,
                }),
            ],
        })
    )

    // Professional Experience
    if (payload.workExperience && payload.workExperience.length > 0) {
        children.push(sectionHeading('Professional Experience'))
        for (const item of payload.workExperience) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: item.company, bold: true, size: 24 }),
                        new TextRun({ text: ' — ', size: 24 }),
                        new TextRun({ text: item.dateRange, size: 24 }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 80 },
                    children: [
                        new TextRun({ text: item.position, italics: true, size: 22 }),
                        ...(item.location ? [new TextRun({ text: ` | ${item.location}`, size: 22 })] : []),
                    ],
                })
            )
            for (const bullet of item.bulletPoints) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    // Key Projects
    if (payload.projects && payload.projects.length > 0) {
        children.push(sectionHeading('Key Projects'))
        for (const project of payload.projects) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: project.name, bold: true, size: 24 }),
                        ...(project.url ? [new TextRun({ text: ` — ${project.url}`, size: 22 })] : []),
                    ],
                })
            )
            for (const bullet of project.bulletPoints || []) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    // Technical Skills
    if (payload.skills && payload.skills.length > 0) {
        children.push(sectionHeading('Technical Skills'))
        children.push(
            new Paragraph({
                spacing: { after: 200 },
                children: [
                    new TextRun({
                        text: payload.skills.join(', '),
                        size: 22,
                    }),
                ],
            })
        )
    }

    // Education
    if (payload.education && payload.education.length > 0) {
        children.push(sectionHeading('Education'))
        for (const item of payload.education) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: item.institution, bold: true, size: 24 }),
                        new TextRun({ text: ` — ${item.dateRange}`, size: 24 }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 80 },
                    children: [new TextRun({ text: item.degree, italics: true, size: 22 })],
                })
            )
            for (const bullet of item.bulletPoints || []) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    // Awards
    if (payload.awards && payload.awards.length > 0) {
        children.push(sectionHeading('Awards'))
        for (const item of payload.awards) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: item.title, bold: true, size: 24 }),
                        ...(item.issuer ? [new TextRun({ text: ` — ${item.issuer}`, size: 24 })] : []),
                        ...(item.date ? [new TextRun({ text: ` (${item.date})`, size: 24 })] : []),
                    ],
                })
            )
            for (const bullet of item.bulletPoints || []) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    // Publications
    if (payload.publications && payload.publications.length > 0) {
        children.push(sectionHeading('Publications'))
        for (const item of payload.publications) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: item.title, bold: true, size: 24 }),
                        ...(item.venue ? [new TextRun({ text: ` — ${item.venue}`, size: 24 })] : []),
                        ...(item.date ? [new TextRun({ text: ` (${item.date})`, size: 24 })] : []),
                    ],
                })
            )
            for (const bullet of item.bulletPoints || []) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    // Extracurricular
    if (payload.extracurriculars && payload.extracurriculars.length > 0) {
        children.push(sectionHeading('Extracurricular Activities'))
        for (const item of payload.extracurriculars) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 80 },
                    children: [
                        new TextRun({ text: item.title, bold: true, size: 24 }),
                        ...(item.organization ? [new TextRun({ text: ` — ${item.organization}`, size: 24 })] : []),
                        ...(item.dateRange ? [new TextRun({ text: ` (${item.dateRange})`, size: 24 })] : []),
                    ],
                })
            )
            for (const bullet of item.bulletPoints || []) {
                if (bullet?.trim()) children.push(bulletParagraph(bullet))
            }
        }
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(0.5),
                            right: convertInchesToTwip(0.5),
                            bottom: convertInchesToTwip(0.5),
                            left: convertInchesToTwip(0.5),
                        },
                    },
                },
                children,
            },
        ],
    })

    return Packer.toBuffer(doc)
}
