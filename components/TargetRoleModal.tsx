'use client'

import { useState, useEffect } from 'react'

interface TargetRoleModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    currentRole?: string | null
}

export default function TargetRoleModal({ isOpen, onClose, onSuccess, currentRole }: TargetRoleModalProps) {
    const [inputMode, setInputMode] = useState<'title' | 'description'>('title')
    const [jobTitle, setJobTitle] = useState('')
    const [jobDescription, setJobDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (currentRole) {
            setJobTitle(currentRole)
        }
    }, [currentRole])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const targetRole = inputMode === 'title' ? jobTitle : extractRoleFromDescription(jobDescription)

            const response = await fetch('/api/user/target-role', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetRole,
                    jobDescription: inputMode === 'description' ? jobDescription : null,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                onSuccess()
                onClose()
            } else {
                setError(result.error || 'Failed to update target role')
            }
        } catch (err) {
            setError('Failed to update target role')
        } finally {
            setLoading(false)
        }
    }

    const extractRoleFromDescription = (description: string): string => {
        // Simple extraction - take first line or first 50 chars
        const firstLine = description.split('\n')[0]
        return firstLine.substring(0, 100).trim() || 'Target Role'
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-light)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">🎯 Set Target Role</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        ×
                    </button>
                </div>

                <p className="text-[var(--text-secondary)] mb-6">
                    Tell us what role you're applying for. Our AI will analyze your projects based on relevance to this role.
                </p>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setInputMode('title')}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${inputMode === 'title'
                                ? 'bg-[var(--orange-primary)] text-white'
                                : 'bg-[var(--bg-warm)] border border-[var(--border-light)]'
                            }`}
                    >
                        Job Title
                    </button>
                    <button
                        onClick={() => setInputMode('description')}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${inputMode === 'description'
                                ? 'bg-[var(--orange-primary)] text-white'
                                : 'bg-[var(--bg-warm)] border border-[var(--border-light)]'
                            }`}
                    >
                        Full Job Description
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {inputMode === 'title' ? (
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Job Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                                placeholder="e.g., Senior Backend Engineer, Full Stack Developer"
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-2">
                                💡 Examples: "Senior Backend Engineer", "Frontend Developer - React", "DevOps Engineer"
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Job Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)] min-h-[200px] font-mono text-sm"
                                placeholder="Paste the full job description here..."
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-2">
                                💡 Paste the entire job posting for more accurate analysis
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-lg border border-[var(--border-light)] font-semibold hover:bg-[var(--bg-warm)] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save Target Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
