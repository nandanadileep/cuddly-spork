'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Education {
    id?: string;
    institution: string;
    degree: string;
    field?: string;
    cgpa?: string;
    location?: string;
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

interface Extracurricular {
    id?: string;
    title: string;
    organization?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
}

interface Award {
    id?: string;
    title: string;
    issuer?: string;
    awarded_at?: string;
    description?: string;
}

interface Publication {
    id?: string;
    title: string;
    venue?: string;
    published_at?: string;
    url?: string;
    description?: string;
}

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [email, setEmail] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isExtractingResume, setIsExtractingResume] = useState(false);
    const [resumeExtractError, setResumeExtractError] = useState('');
    const [resumeExtractSummary, setResumeExtractSummary] = useState<{
        skills: number;
        projects: number;
        education: number;
        experience: number;
        contactFields: number;
    } | null>(null);
    const [linkedInUrl, setLinkedInUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [savingContact, setSavingContact] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const linkedinImportSupported = process.env.NODE_ENV !== 'production';
    // List States
    const [education, setEducation] = useState<Education[]>([]);
    const [experience, setExperience] = useState<WorkExperience[]>([]);
    const [extracurriculars, setExtracurriculars] = useState<Extracurricular[]>([]);
    const [awards, setAwards] = useState<Award[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);

    // Form States
    const [isAddingWork, setIsAddingWork] = useState(false);
    const [isAddingEdu, setIsAddingEdu] = useState(false);
    const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
    const [editingEduId, setEditingEduId] = useState<string | null>(null);
    const [isAddingExtra, setIsAddingExtra] = useState(false);
    const [isAddingAward, setIsAddingAward] = useState(false);
    const [isAddingPub, setIsAddingPub] = useState(false);
    const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
    const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
    const [editingPubId, setEditingPubId] = useState<string | null>(null);

    // Form Data States
    const [newWork, setNewWork] = useState<WorkExperience>({ company: '', position: '', is_current: false });
    const [newEdu, setNewEdu] = useState<Education>({ institution: '', degree: '', is_current: false });
    const [editWork, setEditWork] = useState<WorkExperience>({ company: '', position: '', is_current: false });
    const [editEdu, setEditEdu] = useState<Education>({ institution: '', degree: '', is_current: false });
    const [newExtra, setNewExtra] = useState<Extracurricular>({ title: '', is_current: false });
    const [editExtra, setEditExtra] = useState<Extracurricular>({ title: '', is_current: false });
    const [newAward, setNewAward] = useState<Award>({ title: '' });
    const [editAward, setEditAward] = useState<Award>({ title: '' });
    const [newPub, setNewPub] = useState<Publication>({ title: '' });
    const [editPub, setEditPub] = useState<Publication>({ title: '' });

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
                setExtracurriculars(data.extracurriculars || []);
                setAwards(data.awards || []);
                setPublications(data.publications || []);
                setLinkedInUrl(data.linkedin_url || '');
                setWebsiteUrl(data.website || '');
                setPhone(data.phone || '');
                setLocation(data.location || '');
                setEmail(data.email || '');
                const nameParts = String(data.name || '').trim().split(/\s+/).filter(Boolean);
                setFirstName(nameParts[0] || '');
                setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
                setMiddleName(nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');
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

    const handleResumeExtract = async () => {
        if (!resumeFile) {
            setResumeExtractError('Please choose a resume file to upload.');
            return;
        }

        setIsExtractingResume(true);
        setResumeExtractError('');
        setResumeExtractSummary(null);

        try {
            const formData = new FormData();
            formData.append('file', resumeFile);

            const res = await fetch('/api/profile/resume-import', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setResumeExtractError(data.error || 'Failed to extract resume details.');
                return;
            }

            setResumeExtractSummary(data.summary || null);
            fetchProfile();
        } catch (error) {
            console.error('Resume extract error:', error);
            setResumeExtractError('Failed to extract resume details.');
        } finally {
            setIsExtractingResume(false);
        }
    };

    const handleSaveContact = async () => {
        setSavingContact(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    middleName,
                    lastName,
                    email,
                    linkedinUrl: linkedInUrl,
                    websiteUrl,
                    phone,
                    location,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data?.user) {
                    setLinkedInUrl(data.user.linkedinUrl || '');
                    setWebsiteUrl(data.user.websiteUrl || '');
                    setPhone(data.user.phone || '');
                    setLocation(data.user.location || '');
                    setEmail(data.user.email || '');
                    const nextNameParts = String(data.user.name || '').trim().split(/\s+/).filter(Boolean);
                    setFirstName(nextNameParts[0] || '');
                    setLastName(nextNameParts.length > 1 ? nextNameParts[nextNameParts.length - 1] : '');
                    setMiddleName(nextNameParts.length > 2 ? nextNameParts.slice(1, -1).join(' ') : '');
                    await update?.();
                }
                alert('Saved contact info.');
            } else {
                alert(data?.error || 'Failed to save contact info.');
            }
        } catch (error) {
            console.error('Save contact error:', error);
            alert('Failed to save contact info.');
        } finally {
            setSavingContact(false);
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
	                const data = await res.json().catch(() => ({}));
	                alert(data.error || 'Failed to update experience');
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

    const handleAddExtra = async () => {
        try {
            const res = await fetch('/api/profile/extracurricular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExtra),
            });
            if (res.ok) {
                setNewExtra({ title: '', is_current: false });
                setIsAddingExtra(false);
                fetchProfile();
            } else {
                alert('Failed to add extracurricular');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateExtra = async () => {
        if (!editingExtraId) return;
        try {
            const res = await fetch(`/api/profile/extracurricular?id=${editingExtraId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editExtra),
            });
            if (res.ok) {
                setEditingExtraId(null);
                fetchProfile();
            } else {
                alert('Failed to update extracurricular');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteExtra = async (id: string) => {
        if (!confirm('Are you sure you want to delete this extracurricular?')) return;
        try {
            const res = await fetch(`/api/profile/extracurricular?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchProfile();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddAward = async () => {
        try {
            const res = await fetch('/api/profile/awards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAward),
            });
            if (res.ok) {
                setNewAward({ title: '' });
                setIsAddingAward(false);
                fetchProfile();
            } else {
                alert('Failed to add award');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateAward = async () => {
        if (!editingAwardId) return;
        try {
            const res = await fetch(`/api/profile/awards?id=${editingAwardId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editAward),
            });
            if (res.ok) {
                setEditingAwardId(null);
                fetchProfile();
            } else {
                alert('Failed to update award');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteAward = async (id: string) => {
        if (!confirm('Are you sure you want to delete this award?')) return;
        try {
            const res = await fetch(`/api/profile/awards?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchProfile();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddPub = async () => {
        try {
            const res = await fetch('/api/profile/publications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPub),
            });
            if (res.ok) {
                setNewPub({ title: '' });
                setIsAddingPub(false);
                fetchProfile();
            } else {
                alert('Failed to add publication');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdatePub = async () => {
        if (!editingPubId) return;
        try {
            const res = await fetch(`/api/profile/publications?id=${editingPubId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editPub),
            });
            if (res.ok) {
                setEditingPubId(null);
                fetchProfile();
            } else {
                alert('Failed to update publication');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeletePub = async (id: string) => {
        if (!confirm('Are you sure you want to delete this publication?')) return;
        try {
            const res = await fetch(`/api/profile/publications?id=${id}`, { method: 'DELETE' });
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
                            <span className="text-xl"></span>
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
                                    <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase">
                                        Core Skills
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
                                    <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase">
                                        Key Focus
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
	                    {/* Contact & Links */}
                    <section className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-light)] shadow-sm space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">Contact & Links</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">First name (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="First name"
                                        className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Middle name (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Middle name"
                                        className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Last name (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Last name"
                                        className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Updating your email may require signing in again.
                                </p>
                            </div>

	                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	                            <div className="space-y-2">
	                                <label className="text-sm font-medium text-[var(--text-secondary)]">LinkedIn URL</label>
	                                <input
	                                    type="url"
	                                    placeholder="https://www.linkedin.com/in/username"
	                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
	                                    value={linkedInUrl}
	                                    onChange={(e) => setLinkedInUrl(e.target.value)}
	                                />
	                            </div>
	                            <div className="space-y-2">
	                                <label className="text-sm font-medium text-[var(--text-secondary)]">Website</label>
	                                <input
	                                    type="url"
	                                    placeholder="https://your-site.com"
	                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
	                                    value={websiteUrl}
	                                    onChange={(e) => setWebsiteUrl(e.target.value)}
	                                />
	                            </div>
	                            <div className="space-y-2">
	                                <label className="text-sm font-medium text-[var(--text-secondary)]">Phone (optional)</label>
	                                <input
	                                    type="tel"
	                                    placeholder="+1 (555) 123-4567"
	                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
	                                    value={phone}
	                                    onChange={(e) => setPhone(e.target.value)}
	                                />
	                            </div>
	                            <div className="space-y-2">
	                                <label className="text-sm font-medium text-[var(--text-secondary)]">Location (optional)</label>
	                                <input
	                                    type="text"
	                                    placeholder="City, Country"
	                                    className="w-full px-4 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)] focus:ring-2 focus:ring-[var(--orange-primary)] outline-none"
	                                    value={location}
	                                    onChange={(e) => setLocation(e.target.value)}
	                                />
	                            </div>
	                        </div>

	                        <div className="flex flex-col sm:flex-row gap-3">
	                            <button
	                                onClick={handleSaveContact}
	                                disabled={savingContact}
	                                className="px-6 py-2 bg-[var(--orange-primary)] text-white font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
	                            >
	                                {savingContact ? 'Saving...' : 'Save'}
	                            </button>
	                            {linkedinImportSupported && (
	                                <button
	                                    onClick={handleImport}
	                                    disabled={importing || !linkedInUrl}
	                                    className="px-6 py-2 border border-[var(--border-light)] text-[var(--text-secondary)] font-medium rounded-md hover:bg-[var(--bg-light)] disabled:opacity-50 transition-all"
	                                >
	                                    {importing ? 'Importing...' : 'Import from LinkedIn'}
	                                </button>
	                            )}
	                        </div>

                        <p className="text-xs text-[var(--text-secondary)]">
                            {linkedinImportSupported
                                ? 'LinkedIn import is a best-effort feature and may fail for some accounts.'
                                : 'LinkedIn import is not supported on the deployed app. Add your education and work experience manually below.'}
                        </p>
                    </section>

                    <section className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-light)] shadow-sm space-y-4">
                        <div>
                            <h2 className="text-xl font-bold">Import Resume</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Upload your current resume to extract skills, projects, education, and experience into the right pools.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Resume file (PDF, DOCX, or TXT)</label>
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 rounded-md border border-[var(--border-light)] bg-[var(--bg-light)]"
                            />
                            <button
                                type="button"
                                onClick={handleResumeExtract}
                                disabled={!resumeFile || isExtractingResume}
                                className="px-4 py-2 rounded-md bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                            >
                                {isExtractingResume ? 'Extracting...' : 'Upload & Extract'}
                            </button>

                            {resumeExtractError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {resumeExtractError}
                                </div>
                            )}

                            {resumeExtractSummary && (
                                <div className="p-4 rounded-lg border border-[var(--border-light)] bg-white space-y-1 text-sm text-[var(--text-secondary)]">
                                    <div className="font-semibold text-[var(--text-primary)]">Imported summary</div>
                                    <div>Skills: {resumeExtractSummary.skills}</div>
                                    <div>Projects: {resumeExtractSummary.projects}</div>
                                    <div>Education: {resumeExtractSummary.education}</div>
                                    <div>Work Experience: {resumeExtractSummary.experience}</div>
                                    <div>Contact fields updated: {resumeExtractSummary.contactFields}</div>
                                </div>
                            )}
                        </div>
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
                                    <input placeholder="CGPA (optional)" className="w-full p-2 rounded border" value={newEdu.cgpa || ''} onChange={e => setNewEdu({ ...newEdu, cgpa: e.target.value })} />
                                    <input placeholder="Location" className="w-full p-2 rounded border" value={newEdu.location || ''} onChange={e => setNewEdu({ ...newEdu, location: e.target.value })} />
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
	                                                <div className="space-y-2">
	                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">CGPA (optional)</label>
	                                                    <input className="w-full p-2 border rounded text-sm" value={editEdu.cgpa || ''} onChange={e => setEditEdu({ ...editEdu, cgpa: e.target.value })} />
	                                                </div>
	                                                <div className="space-y-2">
	                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Location</label>
	                                                    <input className="w-full p-2 border rounded text-sm" value={editEdu.location || ''} onChange={e => setEditEdu({ ...editEdu, location: e.target.value })} />
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
	                                                {edu.cgpa && (
	                                                    <div className="text-sm text-[var(--text-secondary)]">CGPA: {edu.cgpa}</div>
	                                                )}
	                                                {edu.location && (
	                                                    <div className="text-sm text-[var(--text-secondary)]">{edu.location}</div>
	                                                )}
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

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Extracurricular Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Extracurricular</h3>
                                <button onClick={() => { setIsAddingExtra(!isAddingExtra); setEditingExtraId(null); }} className="text-sm text-[var(--orange-primary)] hover:underline">
                                    {isAddingExtra ? 'Cancel' : '+ Add'}
                                </button>
                            </div>

                            {isAddingExtra && (
                                <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg space-y-3">
                                    <input placeholder="Title" className="w-full p-2 rounded border" value={newExtra.title} onChange={e => setNewExtra({ ...newExtra, title: e.target.value })} />
                                    <input placeholder="Organization" className="w-full p-2 rounded border" value={newExtra.organization || ''} onChange={e => setNewExtra({ ...newExtra, organization: e.target.value })} />
                                    <input placeholder="Location" className="w-full p-2 rounded border" value={newExtra.location || ''} onChange={e => setNewExtra({ ...newExtra, location: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full p-2 rounded border text-sm" rows={3} value={newExtra.description || ''} onChange={e => setNewExtra({ ...newExtra, description: e.target.value })} />
                                    <div className="flex gap-2 text-sm">
                                        <input type="date" className="p-1 border rounded" onChange={e => setNewExtra({ ...newExtra, start_date: e.target.value })} />
                                        <span className="self-center">to</span>
                                        <input type="date" className="p-1 border rounded" disabled={newExtra.is_current} onChange={e => setNewExtra({ ...newExtra, end_date: e.target.value })} />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={newExtra.is_current} onChange={e => setNewExtra({ ...newExtra, is_current: e.target.checked })} /> Current
                                    </label>
                                    <button onClick={handleAddExtra} className="w-full py-2 bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Save</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {extracurriculars.map((item) => (
                                    <div key={item.id} className="p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg hover:border-[var(--orange-primary)] transition-colors group relative">
                                        {editingExtraId === item.id ? (
                                            <div className="space-y-3 p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Title</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editExtra.title} onChange={e => setEditExtra({ ...editExtra, title: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Organization</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editExtra.organization || ''} onChange={e => setEditExtra({ ...editExtra, organization: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Location</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editExtra.location || ''} onChange={e => setEditExtra({ ...editExtra, location: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                                                    <textarea className="w-full p-2 border rounded text-sm" rows={3} value={editExtra.description || ''} onChange={e => setEditExtra({ ...editExtra, description: e.target.value })} />
                                                </div>
                                                <div className="flex gap-2 text-sm">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] text-[var(--text-secondary)]">Start Date</label>
                                                        <input type="date" className="w-full p-1 border rounded" value={editExtra.start_date?.split('T')[0] || ''} onChange={e => setEditExtra({ ...editExtra, start_date: e.target.value })} />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] text-[var(--text-secondary)]">End Date</label>
                                                        <input type="date" className="w-full p-1 border rounded" disabled={editExtra.is_current} value={editExtra.end_date?.split('T')[0] || ''} onChange={e => setEditExtra({ ...editExtra, end_date: e.target.value })} />
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 text-sm mt-2">
                                                    <input type="checkbox" checked={editExtra.is_current} onChange={e => setEditExtra({ ...editExtra, is_current: e.target.checked })} /> Current
                                                </label>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setEditingExtraId(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                                    <button onClick={handleUpdateExtra} className="px-4 py-2 text-sm bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Update</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-lg">{item.title}</div>
                                                {(item.organization || item.location) && (
                                                    <div className="text-[var(--text-primary)]">
                                                        {[item.organization, item.location].filter(Boolean).join(' · ')}
                                                    </div>
                                                )}
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    {formatDate(item.start_date)} - {item.is_current ? 'Present' : formatDate(item.end_date)}
                                                </div>
                                                {item.description && <div className="text-sm mt-1 text-[var(--text-secondary)] line-clamp-2">{item.description}</div>}

                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setEditingExtraId(item.id!); setEditExtra(item); setIsAddingExtra(false); }} className="text-xs text-[var(--orange-primary)] hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteExtra(item.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Awards Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Awards</h3>
                                <button onClick={() => { setIsAddingAward(!isAddingAward); setEditingAwardId(null); }} className="text-sm text-[var(--orange-primary)] hover:underline">
                                    {isAddingAward ? 'Cancel' : '+ Add'}
                                </button>
                            </div>

                            {isAddingAward && (
                                <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg space-y-3">
                                    <input placeholder="Award title" className="w-full p-2 rounded border" value={newAward.title} onChange={e => setNewAward({ ...newAward, title: e.target.value })} />
                                    <input placeholder="Issuer" className="w-full p-2 rounded border" value={newAward.issuer || ''} onChange={e => setNewAward({ ...newAward, issuer: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full p-2 rounded border text-sm" rows={3} value={newAward.description || ''} onChange={e => setNewAward({ ...newAward, description: e.target.value })} />
                                    <input type="date" className="p-1 border rounded" onChange={e => setNewAward({ ...newAward, awarded_at: e.target.value })} />
                                    <button onClick={handleAddAward} className="w-full py-2 bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Save</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {awards.map((item) => (
                                    <div key={item.id} className="p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg hover:border-[var(--orange-primary)] transition-colors group relative">
                                        {editingAwardId === item.id ? (
                                            <div className="space-y-3 p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Title</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editAward.title} onChange={e => setEditAward({ ...editAward, title: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Issuer</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editAward.issuer || ''} onChange={e => setEditAward({ ...editAward, issuer: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                                                    <textarea className="w-full p-2 border rounded text-sm" rows={3} value={editAward.description || ''} onChange={e => setEditAward({ ...editAward, description: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-[var(--text-secondary)]">Date</label>
                                                    <input type="date" className="w-full p-1 border rounded" value={editAward.awarded_at?.split('T')[0] || ''} onChange={e => setEditAward({ ...editAward, awarded_at: e.target.value })} />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setEditingAwardId(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                                    <button onClick={handleUpdateAward} className="px-4 py-2 text-sm bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Update</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-lg">{item.title}</div>
                                                {item.issuer && <div className="text-[var(--text-primary)]">{item.issuer}</div>}
                                                <div className="text-sm text-[var(--text-secondary)]">{formatDate(item.awarded_at)}</div>
                                                {item.description && <div className="text-sm mt-1 text-[var(--text-secondary)] line-clamp-2">{item.description}</div>}
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setEditingAwardId(item.id!); setEditAward(item); setIsAddingAward(false); }} className="text-xs text-[var(--orange-primary)] hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteAward(item.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Publications Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Publications</h3>
                                <button onClick={() => { setIsAddingPub(!isAddingPub); setEditingPubId(null); }} className="text-sm text-[var(--orange-primary)] hover:underline">
                                    {isAddingPub ? 'Cancel' : '+ Add'}
                                </button>
                            </div>

                            {isAddingPub && (
                                <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg space-y-3">
                                    <input placeholder="Publication title" className="w-full p-2 rounded border" value={newPub.title} onChange={e => setNewPub({ ...newPub, title: e.target.value })} />
                                    <input placeholder="Venue / Journal" className="w-full p-2 rounded border" value={newPub.venue || ''} onChange={e => setNewPub({ ...newPub, venue: e.target.value })} />
                                    <input placeholder="URL" className="w-full p-2 rounded border" value={newPub.url || ''} onChange={e => setNewPub({ ...newPub, url: e.target.value })} />
                                    <textarea placeholder="Description" className="w-full p-2 rounded border text-sm" rows={3} value={newPub.description || ''} onChange={e => setNewPub({ ...newPub, description: e.target.value })} />
                                    <input type="date" className="p-1 border rounded" onChange={e => setNewPub({ ...newPub, published_at: e.target.value })} />
                                    <button onClick={handleAddPub} className="w-full py-2 bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Save</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {publications.map((item) => (
                                    <div key={item.id} className="p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg hover:border-[var(--orange-primary)] transition-colors group relative">
                                        {editingPubId === item.id ? (
                                            <div className="space-y-3 p-4 bg-[var(--bg-light)] border border-[var(--border-light)] rounded-lg">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Title</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editPub.title} onChange={e => setEditPub({ ...editPub, title: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Venue</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editPub.venue || ''} onChange={e => setEditPub({ ...editPub, venue: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">URL</label>
                                                    <input className="w-full p-2 border rounded text-sm" value={editPub.url || ''} onChange={e => setEditPub({ ...editPub, url: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                                                    <textarea className="w-full p-2 border rounded text-sm" rows={3} value={editPub.description || ''} onChange={e => setEditPub({ ...editPub, description: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-[var(--text-secondary)]">Date</label>
                                                    <input type="date" className="w-full p-1 border rounded" value={editPub.published_at?.split('T')[0] || ''} onChange={e => setEditPub({ ...editPub, published_at: e.target.value })} />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setEditingPubId(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                                    <button onClick={handleUpdatePub} className="px-4 py-2 text-sm bg-[var(--orange-primary)] text-white rounded hover:opacity-90">Update</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-lg">{item.title}</div>
                                                {item.venue && <div className="text-[var(--text-primary)]">{item.venue}</div>}
                                                <div className="text-sm text-[var(--text-secondary)]">{formatDate(item.published_at)}</div>
                                                {item.url && (
                                                    <div className="text-xs text-[var(--text-secondary)] break-all">
                                                        {item.url}
                                                    </div>
                                                )}
                                                {item.description && <div className="text-sm mt-1 text-[var(--text-secondary)] line-clamp-2">{item.description}</div>}
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setEditingPubId(item.id!); setEditPub(item); setIsAddingPub(false); }} className="text-xs text-[var(--orange-primary)] hover:underline">Edit</button>
                                                    <button onClick={() => handleDeletePub(item.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
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
