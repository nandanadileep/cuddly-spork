'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface ResumeContent {
    name: string
    targetRole: string | null
    personalInfo: {
        fullName: string
        email: string
        phone: string
        location: string
        linkedin: string
        github: string
        website: string
    }
    summary: string
    skills: string[]
    projects: Array<{
        name: string
        url: string
        description: string
        bulletPoints: string[]
        technologies: string[]
        score: number
    }>
    education: Array<{
        school: string
        degree: string
        field: string
        startDate: string
        endDate: string
    }>
    experience: Array<{
        company: string
        title: string
        startDate: string
        endDate: string
        description: string
        bullets: string[]
    }>
}

interface Resume {
    id: string
    name: string
    template: string
    content_jsonb: ResumeContent
}

export default function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [resume, setResume] = useState<Resume | null>(null)
    const [content, setContent] = useState<ResumeContent | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'personal' | 'summary' | 'skills' | 'projects' | 'education' | 'preview'>('preview')

    useEffect(() => {
        fetchResume()
    }, [id])

    const fetchResume = async () => {
        try {
            const res = await fetch(`/api/resumes/${id}`)
            if (!res.ok) {
                setError('Resume not found')
                return
            }
            const data = await res.json()
            setResume(data.resume)
            setContent(data.resume.content_jsonb)
        } catch (err) {
            setError('Failed to load resume')
        } finally {
            setLoading(false)
        }
    }

    const saveResume = async () => {
        if (!content) return

        setSaving(true)
        try {
            const res = await fetch(`/api/resumes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })

            if (!res.ok) {
                throw new Error('Failed to save')
            }
        } catch (err) {
            setError('Failed to save resume')
        } finally {
            setSaving(false)
        }
    }

    const updatePersonalInfo = (field: string, value: string) => {
        if (!content) return
        setContent({
            ...content,
            personalInfo: { ...content.personalInfo, [field]: value },
        })
    }

    const updateSummary = (value: string) => {
        if (!content) return
        setContent({ ...content, summary: value })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--orange-primary)]"></div>
            </div>
        )
    }

    if (error || !content) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-red-500 mb-4">{error || 'Error loading resume'}</h1>
                <Link href="/resumes" className="text-[var(--orange-primary)] hover:underline">
                    ← Back to Resumes
                </Link>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/resumes" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        ← Back
                    </Link>
                    <h1 className="text-2xl font-bold">{resume?.name}</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={saveResume}
                        disabled={saving}
                        className="bg-[var(--github-green)] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all"
                    >
                        {saving ? 'Saving...' : '💾 Save'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--orange-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[var(--orange-hover)] transition-all"
                    >
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-[var(--border-light)] pb-2">
                {(['preview', 'personal', 'summary', 'skills', 'projects', 'education'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-t-lg font-medium transition-all ${activeTab === tab
                                ? 'bg-[var(--orange-primary)] text-white'
                                : 'bg-[var(--bg-warm)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)]">
                {activeTab === 'preview' && (
                    <div className="max-w-3xl mx-auto bg-white text-black p-8 rounded-lg shadow-lg print:shadow-none">
                        {/* Resume Preview */}
                        <div className="text-center mb-6 border-b pb-4">
                            <h1 className="text-3xl font-bold">{content.personalInfo.fullName || 'Your Name'}</h1>
                            <p className="text-gray-600 mt-2">
                                {[content.personalInfo.email, content.personalInfo.phone, content.personalInfo.location]
                                    .filter(Boolean)
                                    .join(' • ')}
                            </p>
                            <p className="text-gray-500 mt-1">
                                {[content.personalInfo.linkedin, content.personalInfo.github, content.personalInfo.website]
                                    .filter(Boolean)
                                    .join(' • ')}
                            </p>
                        </div>

                        {/* Summary */}
                        {content.summary && (
                            <div className="mb-6">
                                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Summary</h2>
                                <p className="text-gray-700">{content.summary}</p>
                            </div>
                        )}

                        {/* Skills */}
                        {content.skills.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Technical Skills</h2>
                                <p className="text-gray-700">{content.skills.join(' • ')}</p>
                            </div>
                        )}

                        {/* Projects */}
                        {content.projects.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Projects</h2>
                                {content.projects.map((project, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold">{project.name}</h3>
                                            {project.url && (
                                                <a href={project.url} className="text-blue-600 text-sm" target="_blank" rel="noopener noreferrer">
                                                    View →
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-1">{project.technologies.slice(0, 5).join(', ')}</p>
                                        <ul className="list-disc list-inside text-gray-700 text-sm">
                                            {project.bulletPoints.slice(0, 3).map((bullet, i) => (
                                                <li key={i}>{bullet}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Education */}
                        {content.education.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Education</h2>
                                {content.education.map((edu, index) => (
                                    <div key={index} className="mb-2">
                                        <div className="flex justify-between">
                                            <h3 className="font-semibold">{edu.school}</h3>
                                            <span className="text-gray-500 text-sm">{edu.startDate} - {edu.endDate}</span>
                                        </div>
                                        <p className="text-gray-600">{edu.degree} in {edu.field}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'personal' && (
                    <div className="max-w-xl space-y-4">
                        <h2 className="text-xl font-bold mb-4">Personal Information</h2>
                        {[
                            { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
                            { key: 'email', label: 'Email', placeholder: 'john@example.com' },
                            { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567' },
                            { key: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
                            { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/johndoe' },
                            { key: 'github', label: 'GitHub', placeholder: 'github.com/johndoe' },
                            { key: 'website', label: 'Website', placeholder: 'johndoe.com' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium mb-1">{label}</label>
                                <input
                                    type="text"
                                    value={(content.personalInfo as any)[key] || ''}
                                    onChange={(e) => updatePersonalInfo(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'summary' && (
                    <div className="max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">Professional Summary</h2>
                        <textarea
                            value={content.summary}
                            onChange={(e) => updateSummary(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            placeholder="Write a compelling 2-3 sentence summary of your experience..."
                        />
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            💡 This summary was AI-generated from your projects. Feel free to edit it!
                        </p>
                    </div>
                )}

                {activeTab === 'skills' && (
                    <div className="max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">Skills</h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {content.skills.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1.5 bg-[var(--orange-primary)] text-white rounded-full text-sm flex items-center gap-2"
                                >
                                    {skill}
                                    <button
                                        onClick={() => {
                                            const newSkills = content.skills.filter((_, i) => i !== index)
                                            setContent({ ...content, skills: newSkills })
                                        }}
                                        className="hover:text-red-200"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            💡 These skills were extracted from your projects. Click × to remove any.
                        </p>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Projects ({content.projects.length})</h2>
                        <div className="space-y-4">
                            {content.projects.map((project, index) => (
                                <div key={index} className="bg-[var(--bg-warm)] rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold">{project.name}</h3>
                                        <span className="text-sm text-[var(--orange-primary)]">Score: {project.score}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mb-2">{project.description}</p>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {project.technologies.slice(0, 5).map((tech, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-[var(--bg-card)] rounded text-xs">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                    <ul className="list-disc list-inside text-sm">
                                        {project.bulletPoints.map((bullet, i) => (
                                            <li key={i}>{bullet}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'education' && (
                    <div className="max-w-xl">
                        <h2 className="text-xl font-bold mb-4">Education</h2>
                        {content.education.length === 0 ? (
                            <div className="text-center py-8 bg-[var(--bg-warm)] rounded-lg">
                                <p className="text-[var(--text-secondary)] mb-4">No education added yet</p>
                                <button
                                    onClick={() => {
                                        setContent({
                                            ...content,
                                            education: [
                                                ...content.education,
                                                { school: '', degree: '', field: '', startDate: '', endDate: '' },
                                            ],
                                        })
                                    }}
                                    className="bg-[var(--orange-primary)] text-white px-4 py-2 rounded-lg font-semibold"
                                >
                                    + Add Education
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {content.education.map((edu, index) => (
                                    <div key={index} className="bg-[var(--bg-warm)] rounded-lg p-4">
                                        <input
                                            type="text"
                                            value={edu.school}
                                            onChange={(e) => {
                                                const newEdu = [...content.education]
                                                newEdu[index] = { ...edu, school: e.target.value }
                                                setContent({ ...content, education: newEdu })
                                            }}
                                            placeholder="University Name"
                                            className="w-full px-3 py-2 rounded border border-[var(--border-light)] mb-2"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={edu.degree}
                                                onChange={(e) => {
                                                    const newEdu = [...content.education]
                                                    newEdu[index] = { ...edu, degree: e.target.value }
                                                    setContent({ ...content, education: newEdu })
                                                }}
                                                placeholder="Degree (e.g., B.S.)"
                                                className="px-3 py-2 rounded border border-[var(--border-light)]"
                                            />
                                            <input
                                                type="text"
                                                value={edu.field}
                                                onChange={(e) => {
                                                    const newEdu = [...content.education]
                                                    newEdu[index] = { ...edu, field: e.target.value }
                                                    setContent({ ...content, education: newEdu })
                                                }}
                                                placeholder="Field of Study"
                                                className="px-3 py-2 rounded border border-[var(--border-light)]"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        setContent({
                                            ...content,
                                            education: [
                                                ...content.education,
                                                { school: '', degree: '', field: '', startDate: '', endDate: '' },
                                            ],
                                        })
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] hover:border-[var(--orange-primary)]"
                                >
                                    + Add Another
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
