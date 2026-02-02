'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Education {
    id?: string;
    institution: string;
    degree: string;
    field?: string;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
}

interface WorkExperience {
    id?: string;
    company: string;
    position: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
}

export default function ProfilePage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [linkedInUrl, setLinkedInUrl] = useState('');
    // List States
    const [education, setEducation] = useState<Education[]>([]);
    const [experience, setExperience] = useState<WorkExperience[]>([]);

    // Form States
    const [isAddingWork, setIsAddingWork] = useState(false);
    const [isAddingEdu, setIsAddingEdu] = useState(false);
    const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
    const [editingEduId, setEditingEduId] = useState<string | null>(null);

    // Form Data States
    const [newWork, setNewWork] = useState<WorkExperience>({ company: '', position: '', is_current: false });
    const [newEdu, setNewEdu] = useState<Education>({ institution: '', degree: '', is_current: false });
    const [editWork, setEditWork] = useState<WorkExperience>({ company: '', position: '', is_current: false });
    const [editEdu, setEditEdu] = useState<Education>({ institution: '', degree: '', is_current: false });

    // Job Target States
    const [newRole, setNewRole] = useState('');
    const [newJD, setNewJD] = useState('');
    const [isSavingRole, setIsSavingRole] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    useEffect(() => {
        if (!session) return;
        fetchProfile();
    }, [session]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/profile/me');
            if (res.ok) {
                const data = await res.json();
                setEducation(data.education || []);
                setExperience(data.workExperience || []);
                if (data.linkedin_url) setLinkedInUrl(data.linkedin_url);
                setNewRole(data.target_role || '');
                setNewJD(data.job_description_jsonb?.raw_jd || '');
                setAnalysis(data.job_description_jsonb?.analysis || null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const handleImport = async () => {
        if (!linkedInUrl) return;
        setImporting(true);
        try {
            const res = await fetch('/api/profile/linkedin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: linkedInUrl }),
            });
            const data = await res.json();
            if (res.ok) {
                alert('Profile imported successfully!');
                fetchProfile();
            } else {
                alert(data.error || 'Failed to import');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('An error occurred during import.');
        } finally {
            setImporting(false);
        }
    };

    const handleAddWork = async () => {
        try {
            const res = await fetch('/api/profile/experience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWork),
            });
            if (res.ok) {
                setNewWork({ company: '', position: '', is_current: false });
                setIsAddingWork(false);
                fetchProfile();
            } else {
                alert('Failed to add experience');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateWork = async () => {
        if (!editingWorkId) return;
        try {
            const res = await fetch(`/api/profile/experience?id=${editingWorkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editWork),
            });
            if (res.ok) {
                setEditingWorkId(null);
                fetchProfile();
            } else {
                alert('Failed to update experience');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteWork = async (id: string) => {
        if (!confirm('Are you sure you want to delete this experience?')) return;
        try {
            const res = await fetch(`/api/profile/experience?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchProfile();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddEdu = async () => {
        try {
            const res = await fetch('/api/profile/education', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEdu),
            });
            if (res.ok) {
                setNewEdu({ institution: '', degree: '', is_current: false });
                setIsAddingEdu(false);
                fetchProfile();
            } else {
                alert('Failed to add education');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateEdu = async () => {
        if (!editingEduId) return;
        try {
            const res = await fetch(`/api/profile/education?id=${editingEduId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editEdu),
            });
            if (res.ok) {
                setEditingEduId(null);
                fetchProfile();
            } else {
                alert('Failed to update education');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteEdu = async (id: string) => {
        if (!confirm('Are you sure you want to delete this education?')) return;
        try {
            const res = await fetch(`/api/profile/education?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchProfile();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header className="border-b border-[var(--border-light)] pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Profile</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Manage your professional details for resume generation.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Side: Job Target & Connections */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-light)] shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-[var(--orange-primary)] border-b border-[var(--border-light)] pb-3">
                            <span className="text-xl">🎯</span>
                            <h3 className="font-bold text-[var(--text-primary)]">Job Target</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Target Role</label>
                                <div className="p-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-light)] text-sm font-medium text-[var(--text-primary)]">
                                    {newRole || 'Not set'}
                                </div>
                            </div>
                        </div>

                        {analysis && (
                            <div className="pt-4 border-t border-[var(--border-light)] space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase flex items-center gap-1.5">
                                        <span className="text-[var(--orange-primary)]">🛠️</span> Core Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {analysis.requiredSkills?.slice(0, 8).map((skill: string) => (
                                            <span key={skill} className="px-1.5 py-0.5 bg-[var(--bg-light)] text-[var(--text-secondary)] text-[10px] font-medium rounded border border-[var(--border-light)]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase flex items-center gap-1.5">
                                        <span className="text-[var(--orange-primary)]">🎯</span> Key Focus
                                    </h4>
                                    <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 ml-4 list-disc marker:text-[var(--orange-primary)]">
                                        {analysis.keywords?.slice(0, 4).map((kw: string) => (
                                            <li key={kw} className="pl-1">{kw}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="p-5 bg-[var(--green-light)] border border-[var(--github-green)] rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-[var(--github-green)]">
                            <span className="text-xl">⚙️</span>
                            <h3 className="font-bold text-[var(--text-primary)]">Settings</h3>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Need to update your connected accounts? Head over to settings.
                        </p>
                        <Link href="/settings" className="block w-full py-2 bg-white border border-[var(--github-green)] text-[var(--github-green)] text-center rounded-lg text-[11px] font-medium hover:bg-gray-50 transition-colors">
                            Manage Connections
                        </Link>
                    </section>
                </div>

                {/* Right Side: Resume Details */}
                <div className="lg:col-span-3 space-y-8">
                    {/* LinkedIn Import */}
                    <section className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-light)] shadow-sm">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-[#0077b5]">in</span> Import from LinkedIn
                        </h2>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Public Profile URL</label>
                                <input
                                    type="url"
                                    placeholder="https://www.linkedin.com/in/username"
                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
                                    value={linkedInUrl}
                                    onChange={(e) => setLinkedInUrl(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleImport}
                                disabled={importing || !linkedInUrl}
                                className="px-6 py-2 bg-[var(--orange-primary)] text-white font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {importing ? 'Importing...' : 'Import Data'}
                            </button>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                            Note: We use a "best effort" approach to read public profiles.
                        </p>
                    </section>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Work Experience Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Experience</h3>
                                <button onClick={() => { setIsAddingWork(!isAddingWork); setEditingWorkId(null); }} className="text-sm text-[var(--orange-primary)] hover:underline">
                                    {isAddingWork ? 'Cancel' : '+ Add Work'}
                                </button>
                            </div>

                            {isAddingWork && (
                                <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg space-y-3">
                                    <input placeholder="Company" className="w-full p-2 rounded border" value={newWork.company} onChange={e => setNewWork({ ...newWork, company: e.target.value })} />
                                    <input placeholder="Position" className="w-full p-2 rounded border" value={newWork.position} onChange={e => setNewWork({ ...newWork, position: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full p-2 rounded border text-sm" rows={3} value={newWork.description || ''} onChange={e => setNewWork({ ...newWork, description: e.target.value })} />
                                    <div className="flex gap-2 text-sm">
                                        <input type="date" className="p-1 border rounded" onChange={e => setNewWork({ ...newWork, start_date: e.target.value })} />
                                        <span className="self-center">to</span>
                                        <input type="date" className="p-1 border rounded" disabled={newWork.is_current} onChange={e => setNewWork({ ...newWork, end_date: e.target.value })} />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={newWork.is_current} onChange={e => setNewWork({ ...newWork, is_current: e.target.checked })} /> Current Role
                                    </label>
                                    <button onClick={handleAddWork} className="w-full py-2 bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Save</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {experience.map((work) => (
                                    <div key={work.id} className="p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg hover:border-[var(--orange-primary)] transition-colors group relative">
                                        {editingWorkId === work.id ? (
                                            <div className="space-y-3 p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Company</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editWork.company} onChange={e => setEditWork({ ...editWork, company: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Position</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editWork.position} onChange={e => setEditWork({ ...editWork, position: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                                                    <textarea className="w-full p-2 border rounded text-sm" rows={3} value={editWork.description || ''} onChange={e => setEditWork({ ...editWork, description: e.target.value })} />
                                                </div>

                                                <div className="flex gap-2 text-sm">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] text-[var(--text-secondary)]">Start Date</label>
                                                        <input type="date" className="w-full p-1 border rounded" value={editWork.start_date?.split('T')[0] || ''} onChange={e => setEditWork({ ...editWork, start_date: e.target.value })} />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] text-[var(--text-secondary)]">End Date</label>
                                                        <input type="date" className="w-full p-1 border rounded" disabled={editWork.is_current} value={editWork.end_date?.split('T')[0] || ''} onChange={e => setEditWork({ ...editWork, end_date: e.target.value })} />
                                                    </div>
                                                </div>

                                                <label className="flex items-center gap-2 text-sm mt-2">
                                                    <input type="checkbox" checked={editWork.is_current} onChange={e => setEditWork({ ...editWork, is_current: e.target.checked })} /> Current Role
                                                </label>

                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setEditingWorkId(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                                    <button onClick={handleUpdateWork} className="px-4 py-2 text-sm bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Update</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-lg">{work.position}</div>
                                                <div className="text-[var(--text-primary)]">{work.company}</div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    {formatDate(work.start_date)} - {work.is_current ? 'Present' : formatDate(work.end_date)}
                                                </div>
                                                {work.description && <div className="text-sm mt-1 text-[var(--text-secondary)] line-clamp-2">{work.description}</div>}

                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setEditingWorkId(work.id!); setEditWork(work); setIsAddingWork(false); }} className="text-xs text-[var(--orange-primary)] hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteWork(work.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Education Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Education</h3>
                                <button onClick={() => { setIsAddingEdu(!isAddingEdu); setEditingEduId(null); }} className="text-sm text-[var(--orange-primary)] hover:underline">
                                    {isAddingEdu ? 'Cancel' : '+ Add Education'}
                                </button>
                            </div>

                            {isAddingEdu && (
                                <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg space-y-3">
                                    <input placeholder="School" className="w-full p-2 rounded border" value={newEdu.institution} onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })} />
                                    <input placeholder="Degree" className="w-full p-2 rounded border" value={newEdu.degree} onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })} />
                                    <div className="flex gap-2 text-sm">
                                        <input type="date" className="p-1 border rounded" onChange={e => setNewEdu({ ...newEdu, start_date: e.target.value })} />
                                        <span className="self-center">to</span>
                                        <input type="date" className="p-1 border rounded" disabled={newEdu.is_current} onChange={e => setNewEdu({ ...newEdu, end_date: e.target.value })} />
                                    </div>
                                    <button onClick={handleAddEdu} className="w-full py-2 bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Save</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {education.map((edu) => (
                                    <div key={edu.id} className="p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg hover:border-[var(--orange-primary)] transition-colors group relative">
                                        {editingEduId === edu.id ? (
                                            <div className="space-y-3 p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Institution</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editEdu.institution} onChange={e => setEditEdu({ ...editEdu, institution: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Degree</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editEdu.degree} onChange={e => setEditEdu({ ...editEdu, degree: e.target.value })} />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setEditingEduId(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                                    <button onClick={handleUpdateEdu} className="px-4 py-2 text-sm bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Update</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-lg">{edu.institution}</div>
                                                <div className="text-[var(--text-primary)]">{edu.degree}</div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : formatDate(edu.end_date)}
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setEditingEduId(edu.id!); setEditEdu(edu); setIsAddingEdu(false); }} className="text-xs text-[var(--orange-primary)] hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteEdu(edu.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
