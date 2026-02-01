'use client'

import { useState } from 'react'

interface AddProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddProjectModal({ isOpen, onClose, onSuccess }: AddProjectModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        technologies: '',
        url: '',
        startDate: '',
        endDate: '',
        role: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const technologies = formData.technologies
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)

            const response = await fetch('/api/projects/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    technologies,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                onSuccess()
                onClose()
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    technologies: '',
                    url: '',
                    startDate: '',
                    endDate: '',
                    role: '',
                })
            } else {
                setError(result.error || 'Failed to add project')
            }
        } catch (err) {
            setError('Failed to add project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-light)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Add Manual Project</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Project Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            placeholder="My Awesome Project"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)] min-h-[100px]"
                            placeholder="Describe what this project does and your role in it..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Technologies
                        </label>
                        <input
                            type="text"
                            value={formData.technologies}
                            onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            placeholder="React, Node.js, PostgreSQL (comma-separated)"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Separate technologies with commas
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Project URL
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            placeholder="https://github.com/username/project"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Start Date
                            </label>
                            <input
                                type="month"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                End Date
                            </label>
                            <input
                                type="month"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Your Role
                        </label>
                        <input
                            type="text"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] focus:outline-none focus:border-[var(--orange-primary)]"
                            placeholder="Full Stack Developer, Lead Engineer, etc."
                        />
                    </div>

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
                            {loading ? 'Adding...' : 'Add Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
