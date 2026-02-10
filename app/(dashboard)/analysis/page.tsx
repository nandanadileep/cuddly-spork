'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Project {
    id: string
    name: string
    description: string | null
    url: string
    stars: number | null
    forks: number | null
    language: string | null
    platform: string
    ai_score: number | null
    ai_analysis_jsonb: any
    is_selected: boolean
}

interface ManualProject {
    id: string
    name: string
    description: string
    technologies: string[]
    notes: string[]
}

export default function AnalysisFlowPage() {
    const { status } = useSession()
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
    const [draftStatus, setDraftStatus] = useState<'unknown' | 'exists' | 'missing'>('unknown')
    const [manualProjects, setManualProjects] = useState<ManualProject[]>([])
    const [urlDetectedPlatform, setUrlDetectedPlatform] = useState<string | null>(null)
    const [urlNeedsDetails, setUrlNeedsDetails] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisProgress, setAnalysisProgress] = useState<{ total: number; current: number; failed: number } | null>(null)
    const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)
    const [resumeAnalysisNotice, setResumeAnalysisNotice] = useState<{ total: number; analyzed: number } | null>(null)
    const [skills, setSkills] = useState<string[]>([])
    const [manualSkills, setManualSkills] = useState<string[]>([])
    const [excludedSkills, setExcludedSkills] = useState<string[]>([])
    const [skillInput, setSkillInput] = useState('')
    const [isAddingSkill, setIsAddingSkill] = useState(false)
    const [roleSkillSuggestions, setRoleSkillSuggestions] = useState<string[]>([])
    const [roleTitle, setRoleTitle] = useState<string | null>(null)
    const [manualProjectInput, setManualProjectInput] = useState({
        name: '',
        description: '',
        technologies: '',
        url: '',
    })
    const [isAutoSelecting, setIsAutoSelecting] = useState(false)
    const [analysisCooldown, setAnalysisCooldown] = useState(0)
    const [skillsMessage, setSkillsMessage] = useState<string | null>(null)
    const [isFetchingUrl, setIsFetchingUrl] = useState(false)
    const [urlMessage, setUrlMessage] = useState<string | null>(null)

    const keywordSkills = [
        // Languages
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'C', 'Swift', 'Kotlin', 'Scala',
        'Ruby', 'PHP', 'Elixir', 'Erlang', 'Haskell', 'Clojure', 'R', 'MATLAB', 'Dart', 'Lua', 'Perl',
        'Bash', 'PowerShell', 'SQL',
        // Frontend
        'HTML', 'CSS', 'Sass', 'Less', 'Tailwind', 'Bootstrap', 'Material UI', 'Chakra UI', 'Ant Design',
        'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit', 'Remix', 'Gatsby', 'SolidJS',
        'Redux', 'Zustand', 'MobX', 'Recoil', 'React Query', 'SWR',
        // Backend
        'Node.js', 'Express', 'NestJS', 'Fastify', 'Koa', 'Hapi',
        'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Quarkus', 'Micronaut',
        'ASP.NET', '.NET', 'Rails', 'Laravel', 'Phoenix',
        // Data / ML
        'Pandas', 'NumPy', 'SciPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'XGBoost',
        'LightGBM', 'CatBoost', 'OpenCV', 'Hugging Face', 'LangChain',
        'LLM', 'ChatGPT', 'OpenAI', 'RAG', 'Vector DB', 'Embeddings',
        // Datastores
        'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'MongoDB', 'DynamoDB', 'Cassandra',
        'Redis', 'Elasticsearch', 'OpenSearch', 'ClickHouse', 'BigQuery', 'Snowflake',
        // Cloud / DevOps
        'AWS', 'GCP', 'Azure', 'Terraform', 'CloudFormation', 'Pulumi',
        // AWS Services
        'Lambda', 'S3', 'EC2', 'ECS', 'EKS', 'Fargate', 'RDS', 'DynamoDB', 'Aurora', 'Redshift',
        'CloudFront', 'Route 53', 'API Gateway', 'SQS', 'SNS', 'EventBridge', 'Step Functions',
        'CloudWatch', 'CloudTrail', 'IAM', 'KMS', 'Secrets Manager', 'Cognito',
        'SageMaker', 'Bedrock', 'Glue', 'Athena', 'EMR', 'ElastiCache', 'OpenSearch',
        'AppSync', 'Amplify', 'Elastic Beanstalk', 'CodeBuild', 'CodePipeline', 'CodeDeploy',
        // GCP Services
        'BigQuery', 'Cloud Run', 'Cloud Functions', 'Compute Engine', 'GKE', 'Cloud Storage',
        'Cloud SQL', 'Spanner', 'Firestore', 'Pub/Sub', 'Dataflow', 'Dataproc',
        'Cloud Build', 'Cloud Scheduler', 'Cloud Tasks', 'Secret Manager',
        'Vertex AI', 'Bigtable', 'Looker', 'Cloud Logging', 'Cloud Monitoring',
        // Azure Services
        'Azure Functions', 'App Service', 'AKS', 'Blob Storage', 'Cosmos DB',
        'SQL Database', 'Event Hubs', 'Service Bus', 'Azure DevOps', 'Azure ML',
        'Key Vault', 'Azure Monitor', 'App Insights',
        'Docker', 'Kubernetes', 'Helm', 'ArgoCD', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Jenkins',
        'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Sentry', 'ELK', 'OpenTelemetry',
        // APIs / Protocols
        'REST', 'GraphQL', 'gRPC', 'WebSocket', 'OAuth', 'JWT',
        // Mobile
        'React Native', 'Flutter', 'iOS', 'Android',
        // Testing
        'Jest', 'Vitest', 'Cypress', 'Playwright', 'Puppeteer', 'PyTest', 'JUnit',
        // Tools
        'Git', 'Linux', 'Nginx', 'Apache', 'Kafka', 'RabbitMQ', 'Redis Streams'
    ]

    const normalizeTechList = (value: any): string[] => {
        if (Array.isArray(value)) {
            return value.filter((item) => typeof item === 'string')
        }
        if (value && typeof value === 'object' && Array.isArray(value.items)) {
            return value.items.filter((item: any) => typeof item === 'string')
        }
        return []
    }

    const deriveSkillsFromProjects = (apiProjects: Project[], manual: ManualProject[]) => {
        const derivedSkills = new Set<string>()
        const matchKeywords = (text: string) => {
            const lower = text.toLowerCase()
            keywordSkills.forEach((skill) => {
                if (lower.includes(skill.toLowerCase())) {
                    derivedSkills.add(skill)
                }
            })
        }

        apiProjects.forEach((project) => {
            if (project.language) derivedSkills.add(project.language)
            const techs = normalizeTechList((project as any).technologies_jsonb)
            techs.forEach((tech: any) => typeof tech === 'string' && derivedSkills.add(tech))
            const aiTechs = project.ai_analysis_jsonb?.techStack || []
            aiTechs.forEach((tech: any) => typeof tech === 'string' && derivedSkills.add(tech))
            if (project.name) matchKeywords(project.name)
            if (project.description) matchKeywords(project.description)
            if (project.ai_analysis_jsonb?.summary) matchKeywords(project.ai_analysis_jsonb.summary)
            if (project.ai_analysis_jsonb?.readme_excerpt) matchKeywords(project.ai_analysis_jsonb.readme_excerpt)
            if (Array.isArray(project.ai_analysis_jsonb?.strengths)) {
                project.ai_analysis_jsonb.strengths.forEach((item: any) => typeof item === 'string' && matchKeywords(item))
            }
            if (Array.isArray(project.ai_analysis_jsonb?.improvements)) {
                project.ai_analysis_jsonb.improvements.forEach((item: any) => typeof item === 'string' && matchKeywords(item))
            }
            if (Array.isArray(project.ai_analysis_jsonb?.bulletPoints)) {
                project.ai_analysis_jsonb.bulletPoints.forEach((item: any) => typeof item === 'string' && matchKeywords(item))
            }
        })

        manual.forEach((project) => {
            if (project.name) matchKeywords(project.name)
            if (project.description) matchKeywords(project.description)
            project.technologies.forEach((tech) => derivedSkills.add(tech))
        })

        return Array.from(derivedSkills)
    }

    const applyExcludedSkills = (items: string[]) => {
        if (excludedSkills.length === 0) return items
        const excluded = new Set(excludedSkills.map(item => item.toLowerCase()))
        return items.filter(item => !excluded.has(item.toLowerCase()))
    }

    const areSkillsEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false
        const setA = new Set(a.map(item => item.toLowerCase()))
        for (const item of b) {
            if (!setA.has(item.toLowerCase())) return false
        }
        return true
    }

    const getAnalysisSnapshot = () => {
        const apiSelected = projects.filter(project => selectedProjectIds.includes(project.id))
        let analyzedCount = 0
        const pendingIds: string[] = []

        apiSelected.forEach((project) => {
            const hasAnalysis = project.ai_score !== null || project.ai_analysis_jsonb
            if (hasAnalysis) {
                analyzedCount += 1
            } else {
                pendingIds.push(project.id)
            }
        })

        return {
            total: apiSelected.length,
            analyzedCount,
            pendingIds,
        }
    }

    const fetchProjects = () => {
        return fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (data.projects) {
                    setProjects(data.projects)
                    return data
                }
            })
            .catch(err => console.error('Failed to fetch projects:', err))
    }

    const fetchDraft = () => {
        return fetch('/api/analysis-draft')
            .then(res => res.json())
            .then(data => {
                if (data?.draft) {
                    setDraftStatus('exists')
                    setSelectedProjectIds(data.draft.selectedProjectIds || [])
                    setManualProjects(data.draft.manualProjects || [])
                    setSkills(Array.isArray(data.draft.skills) ? data.draft.skills.filter((item: any) => typeof item === 'string') : [])
                    setManualSkills(Array.isArray(data.draft.manualSkills) ? data.draft.manualSkills.filter((item: any) => typeof item === 'string') : [])
                    setExcludedSkills(Array.isArray(data.draft.excludedSkills) ? data.draft.excludedSkills.filter((item: any) => typeof item === 'string') : [])
                } else {
                    // Only auto-select for users with no draft. If a user clears selection, keep it cleared.
                    setDraftStatus('missing')
                }
            })
            .catch(err => {
                console.error('Failed to fetch analysis draft:', err)
                setDraftStatus('unknown')
            })
    }

    const fetchRoleSuggestions = () => {
        return fetch('/api/user/target-role')
            .then(res => res.json())
            .then(data => {
                const jobDescription = data?.jobDescription || null
                const requiredSkills = Array.isArray(jobDescription?.requiredSkills) ? jobDescription.requiredSkills : []
                const preferredSkills = Array.isArray(jobDescription?.preferredSkills) ? jobDescription.preferredSkills : []
                const tools = Array.isArray(jobDescription?.tools) ? jobDescription.tools : []

                const combined = [...requiredSkills, ...preferredSkills, ...tools]
                    .filter((item) => typeof item === 'string')
                    .map((item) => item.trim())
                    .filter(Boolean)

                const seen = new Set<string>()
                const unique: string[] = []
                combined.forEach((skill) => {
                    const key = skill.toLowerCase()
                    if (seen.has(key)) return
                    seen.add(key)
                    unique.push(skill)
                })

                setRoleSkillSuggestions(unique)
                setRoleTitle(data?.targetRole || jobDescription?.title || null)
            })
            .catch(() => {
                setRoleSkillSuggestions([])
                setRoleTitle(null)
            })
    }

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true)
            Promise.all([fetchProjects(), fetchDraft(), fetchRoleSuggestions()]).finally(() => setIsLoading(false))
        }
    }, [status])

    useEffect(() => {
        if (status !== 'authenticated') return
        if (draftStatus === 'unknown') return

        const inProgress = typeof window !== 'undefined' && localStorage.getItem('shipcv_analysis_in_progress') === 'true'
        const snapshot = getAnalysisSnapshot()

        if (snapshot.pendingIds.length > 0 && inProgress) {
            setResumeAnalysisNotice({ total: snapshot.total, analyzed: snapshot.analyzedCount })
        } else {
            setResumeAnalysisNotice(null)
            if (snapshot.pendingIds.length === 0 && typeof window !== 'undefined') {
                localStorage.removeItem('shipcv_analysis_in_progress')
            }
        }
    }, [projects, selectedProjectIds, status, draftStatus])

    useEffect(() => {
        if (status !== 'authenticated') return
        if (projects.length === 0) return
        if (draftStatus === 'unknown') return
        if (selectedProjectIds.length > 0) return

        const autoSelect = async () => {
            setIsAutoSelecting(true)
            try {
                const scoredProjects = projects
                    .filter(project => typeof project.ai_score === 'number')
                    .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))

                if (scoredProjects.length > 0) {
                    const topIds = scoredProjects.slice(0, 7).map(project => project.id)
                    setSelectedProjectIds(topIds)
                    setDraftStatus('exists')
                    await saveDraft({ selectedProjectIds: topIds })
                    return
                }

                if (draftStatus === 'missing') {
                    const res = await fetch('/api/projects/auto-select', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ limit: 7 }),
                    })
                    const data = await res.json()
                    if (res.ok && data.projectIds) {
                        setSelectedProjectIds(data.projectIds)
                        setDraftStatus('exists')
                        await fetchProjects()
                        await saveDraft({ selectedProjectIds: data.projectIds })
                    }
                }
            } catch (error) {
                console.error('Auto-select error:', error)
            } finally {
                setIsAutoSelecting(false)
            }
        }

        autoSelect()
    }, [status, projects, selectedProjectIds, draftStatus])

    useEffect(() => {
        if (step !== 3) return
        if (selectedProjectIds.length === 0) return

        const apiSelected = projects.filter(project => selectedProjectIds.includes(project.id))
        const manualSelected = manualProjects.filter(project => selectedProjectIds.includes(project.id))
        const derived = applyExcludedSkills(deriveSkillsFromProjects(apiSelected, manualSelected))
        if (derived.length === 0) return
        if (areSkillsEqual(derived, skills)) return

        setSkills(derived)
        saveDraft({ skills: derived })
        setSkillsMessage('Skills generated from selected projects.')
    }, [step, selectedProjectIds, projects, manualProjects, skills, excludedSkills])

    const toggleProjectSelection = (projectId: string) => {
        const next = selectedProjectIds.includes(projectId)
            ? selectedProjectIds.filter(id => id !== projectId)
            : [...selectedProjectIds, projectId]
        setSelectedProjectIds(next)
        saveDraft({ selectedProjectIds: next })
    }

    const handleAddManualProject = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedName = manualProjectInput.name.trim()
        const trimmedDescription = manualProjectInput.description.trim()

        if (!trimmedName || !trimmedDescription) return

        const technologies = manualProjectInput.technologies
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)

        const newProject: ManualProject = {
            id: `manual-${Date.now()}`,
            name: trimmedName,
            description: trimmedDescription,
            technologies,
            notes: [],
        }

        const nextManualProjects = [...manualProjects, newProject]
        const nextSelected = [...selectedProjectIds, newProject.id]
        setManualProjects(nextManualProjects)
        setSelectedProjectIds(nextSelected)
        saveDraft({ manualProjects: nextManualProjects, selectedProjectIds: nextSelected })
        setManualProjectInput({ name: '', description: '', technologies: '', url: '' })
    }

    const handleRemoveManualProject = (projectId: string) => {
        const nextManual = manualProjects.filter(project => project.id !== projectId)
        const nextSelected = selectedProjectIds.filter(id => id !== projectId)
        setManualProjects(nextManual)
        setSelectedProjectIds(nextSelected)
        saveDraft({ manualProjects: nextManual, selectedProjectIds: nextSelected })
    }

    const handleFetchFromUrl = async () => {
        if (!manualProjectInput.url.trim()) {
            setUrlMessage('Add a URL to fetch details.')
            return
        }
        setIsFetchingUrl(true)
        setUrlMessage(null)
        try {
            const res = await fetch('/api/projects/fetch-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: manualProjectInput.url.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                const fallbackTitle = manualProjectInput.name || manualProjectInput.url
                try {
                    await fetch('/api/projects/manual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: manualProjectInput.url.trim(),
                            title: fallbackTitle,
                            description: manualProjectInput.description || '',
                            keywords: manualProjectInput.technologies ? manualProjectInput.technologies.split(',').map(item => item.trim()).filter(Boolean) : [],
                            platform: 'custom',
                        }),
                    })
                } catch {
                    // ignore
                }
                setUrlDetectedPlatform(null)
                setUrlNeedsDetails(true)
                setUrlMessage('Could not fetch details. URL saved — please fill the fields manually.')
                return
            }
            await fetch('/api/projects/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: data.url,
                    title: data.title,
                    description: data.description,
                    keywords: data.keywords,
                    platform: data.platform,
                }),
            })
            setManualProjectInput(prev => ({
                ...prev,
                url: data.url || prev.url,
                name: prev.name || data.title || '',
                description: prev.description || data.description || '',
                technologies: prev.technologies || (Array.isArray(data.keywords) ? data.keywords.join(', ') : ''),
            }))
            setUrlDetectedPlatform(data.platform || null)
            setUrlNeedsDetails(false)
            setUrlMessage('Details pulled from URL.')
        } catch (error) {
            console.error('Fetch URL error:', error)
            setUrlMessage('Failed to fetch URL.')
        } finally {
            setIsFetchingUrl(false)
        }
    }

    const saveDraft = async (overrides?: Partial<{
        selectedProjectIds: string[]
        manualProjects: ManualProject[]
        skills: string[]
        manualSkills: string[]
        excludedSkills: string[]
    }>) => {
        const payload = {
            selectedProjectIds,
            manualProjects,
            skills,
            manualSkills,
            excludedSkills,
            ...overrides,
        }

        try {
            await fetch('/api/analysis-draft', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
        } catch (error) {
            console.error('Failed to save analysis draft:', error)
        }
    }

    const handleAnalyzeSelected = async () => {
        const { total, analyzedCount, pendingIds } = getAnalysisSnapshot()
        if (total === 0) return

        if (pendingIds.length === 0) {
            setAnalysisProgress({ total, current: total, failed: 0 })
            setAnalysisMessage('All selected projects are already analyzed.')
            setResumeAnalysisNotice(null)
            if (typeof window !== 'undefined') {
                localStorage.removeItem('shipcv_analysis_in_progress')
            }
            return
        }

        setIsAnalyzing(true)
        setAnalysisProgress({ total, current: analyzedCount, failed: 0 })
        setResumeAnalysisNotice(null)
        if (typeof window !== 'undefined') {
            localStorage.setItem('shipcv_analysis_in_progress', 'true')
        }
        try {
            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
            const batchSize = 3
            const cooldownSeconds = 20
            let failedCount = 0
            let processedCount = analyzedCount

            for (let start = 0; start < pendingIds.length; start += batchSize) {
                const batch = pendingIds.slice(start, start + batchSize)
                const res = await fetch('/api/projects/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectIds: batch }),
                })
                if (!res.ok) {
                    failedCount += batch.length
                } else {
                    const data = await res.json()
                    if (Array.isArray(data.results)) {
                        failedCount += data.results.filter((item: any) => item?.success === false).length
                    }
                }
                processedCount = Math.min(processedCount + batch.length, total)
                setAnalysisProgress((prev) => ({
                    total,
                    current: processedCount,
                    failed: failedCount
                }))

                if (start + batchSize < pendingIds.length) {
                    setAnalysisCooldown(cooldownSeconds)
                    for (let i = cooldownSeconds; i > 0; i -= 1) {
                        await sleep(1000)
                        setAnalysisCooldown(i - 1)
                    }
                }
            }
            const refreshed = await fetchProjects()
            if (failedCount > 0) {
                setAnalysisMessage(`Analysis complete with ${failedCount} failed project${failedCount === 1 ? '' : 's'}.`)
            } else {
                setAnalysisMessage('Analysis complete! All selected projects are scored.')
            }

            const latestProjects = (refreshed as any)?.projects || projects
            const selectedProjects = latestProjects.filter((project: Project) => selectedProjectIds.includes(project.id))
            const manualSelected = manualProjects.filter(project => selectedProjectIds.includes(project.id))
            const nextSkills = applyExcludedSkills(deriveSkillsFromProjects(selectedProjects, manualSelected))
            if (nextSkills.length > 0) {
                setSkills(nextSkills)
                await saveDraft({ skills: nextSkills })
                setSkillsMessage('Skills updated from project analysis.')
            }
            if (typeof window !== 'undefined') {
                localStorage.removeItem('shipcv_analysis_in_progress')
            }
        } catch (error) {
            console.error('Analysis error:', error)
            setAnalysisMessage('Analysis failed. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const hasSkill = (items: string[], value: string) =>
        items.some((item) => item.toLowerCase() === value.toLowerCase())

    const addManualSkill = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return
        if (hasSkill(manualSkills, trimmed) || hasSkill(skills, trimmed)) return
        const next = [...manualSkills, trimmed]
        setManualSkills(next)
        setSkillInput('')
        setIsAddingSkill(true)
        try {
            await saveDraft({ manualSkills: next })
        } finally {
            setIsAddingSkill(false)
        }
    }

    const handleAddManualSkill = async () => {
        await addManualSkill(skillInput)
    }

    const handleRemoveSkill = (skill: string) => {
        const nextExcluded = excludedSkills.includes(skill) ? excludedSkills : [...excludedSkills, skill]
        const nextSkills = skills.filter(item => item !== skill)
        setExcludedSkills(nextExcluded)
        setSkills(nextSkills)
        saveDraft({ skills: nextSkills, excludedSkills: nextExcluded })
    }

    const handleRestoreSkill = (skill: string) => {
        const nextExcluded = excludedSkills.filter(item => item !== skill)
        setExcludedSkills(nextExcluded)
        saveDraft({ excludedSkills: nextExcluded })
    }

    const combinedSelectedProjects = useMemo(() => {
        const apiProjects = projects.filter(project => selectedProjectIds.includes(project.id))
        const manual = manualProjects.filter(project => selectedProjectIds.includes(project.id))
        return { apiProjects, manual }
    }, [projects, manualProjects, selectedProjectIds])

    const roleSuggestionSet = useMemo(() => {
        const existing = new Set<string>()
        skills.forEach((skill) => existing.add(skill.toLowerCase()))
        manualSkills.forEach((skill) => existing.add(skill.toLowerCase()))
        excludedSkills.forEach((skill) => existing.add(skill.toLowerCase()))
        return existing
    }, [skills, manualSkills, excludedSkills])

    const filteredRoleSuggestions = useMemo(() => {
        if (roleSkillSuggestions.length === 0) return []
        const query = skillInput.trim().toLowerCase()
        return roleSkillSuggestions.filter((skill) => {
            const key = skill.toLowerCase()
            if (roleSuggestionSet.has(key)) return false
            if (query && !key.includes(query)) return false
            return true
        })
    }, [roleSkillSuggestions, roleSuggestionSet, skillInput])

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-2xl font-serif text-[var(--text-secondary)]">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">AI Analysis Flow</h1>
                    <p className="text-[var(--text-secondary)] text-lg">
                        Move from project selection → AI analysis → curated skills with manual overrides at every step.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-md border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                >
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 1, label: 'Projects' },
                    { id: 2, label: 'AI Analysis' },
                    { id: 3, label: 'Skills' },
                ].map(item => (
                    <div
                        key={item.id}
                        className={`rounded-xl border p-4 ${step === item.id
                                ? 'bg-[var(--bg-card)] border-[var(--orange-primary)] shadow-sm'
                                : 'bg-[var(--bg-warm)] border-[var(--border-light)]'
                            }`}
                    >
                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">Step {item.id}</div>
                        <div className="text-lg font-semibold text-[var(--text-primary)]">{item.label}</div>
                    </div>
                ))}
            </div>

            <div className="sticky top-20 z-40">
                <div className="bg-[var(--bg-card)]/95 backdrop-blur rounded-2xl p-4 border border-[var(--border-light)] shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">
                                Step {step} of 3
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1 truncate">
                                {step === 1 && 'Pick projects to include (you can add projects manually too).'}
                                {step === 2 && 'Run AI scoring (optional) and edit your project highlights.'}
                                {step === 3 && 'Review skills and add/remove anything before the builder.'}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 1) router.push('/dashboard')
                                    else setStep((step - 1) as any)
                                }}
                                className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                            >
                                {step === 1 ? 'Back to Dashboard' : 'Back'}
                            </button>

                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={handleAnalyzeSelected}
                                    disabled={isAnalyzing || combinedSelectedProjects.apiProjects.length === 0}
                                    className="px-4 py-2 rounded-lg bg-white border border-[var(--border-light)] text-[var(--text-primary)] text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {isAnalyzing && analysisProgress
                                        ? `Analyzing ${analysisProgress.current}/${analysisProgress.total}`
                                        : 'Analyze Projects'}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={async () => {
                                    await saveDraft()
                                    if (step === 1) setStep(2)
                                    else if (step === 2) setStep(3)
                                    else router.push('/builder')
                                }}
                                disabled={step === 1 && selectedProjectIds.length === 0}
                                className="px-5 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-sm font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {step === 1 && 'Continue to AI Analysis'}
                                {step === 2 && 'Continue to Skills'}
                                {step === 3 && 'Continue to Builder'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-serif font-semibold">AI Selected Projects</h2>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Click a project card to exclude it from analysis.
                                    </p>
                                </div>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    {selectedProjectIds.length} selected
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => toggleProjectSelection(project.id)}
                                        className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedProjectIds.includes(project.id)
                                                ? 'border-[var(--orange-primary)] bg-[var(--orange-light)]'
                                                : 'border-[var(--border-light)] bg-[var(--bg-card)] hover:shadow-sm'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                            <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                                {project.description || 'No description'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {isAutoSelecting && (
                            <div className="text-xs text-[var(--text-secondary)]">
                                Auto-selecting top projects based on AI scores...
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-2">Add Project Manually</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Don’t see a project? Add it here and continue through the flow.
                            </p>
                            <form onSubmit={handleAddManualProject} className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={manualProjectInput.url}
                                        onChange={(e) => setManualProjectInput(prev => ({ ...prev, url: e.target.value }))}
                                        placeholder="Project URL (GitHub, Kaggle, Figma, etc.)"
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleFetchFromUrl}
                                        disabled={isFetchingUrl}
                                        className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-warm)] disabled:opacity-50"
                                    >
                                        {isFetchingUrl ? 'Fetching...' : 'Fetch'}
                                    </button>
                                </div>
                                {(urlDetectedPlatform || urlNeedsDetails) && (
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                        {urlDetectedPlatform && (
                                            <span className="px-2 py-1 rounded-full bg-[var(--orange-light)] text-[var(--text-primary)]">
                                                {urlDetectedPlatform.toUpperCase()}
                                            </span>
                                        )}
                                        {urlNeedsDetails && (
                                            <span className="px-2 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)]">
                                                Needs details
                                            </span>
                                        )}
                                    </div>
                                )}
                                {urlMessage && (
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {urlMessage}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={manualProjectInput.name}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Project name"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                    required
                                />
                                <textarea
                                    value={manualProjectInput.description}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Project description"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] min-h-[100px]"
                                    required
                                />
                                <input
                                    type="text"
                                    value={manualProjectInput.technologies}
                                    onChange={(e) => setManualProjectInput(prev => ({ ...prev, technologies: e.target.value }))}
                                    placeholder="Technologies (comma-separated)"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                />
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                                >
                                    Add Projects Manually
                                </button>
                            </form>
                        </div>

                        {manualProjects.length > 0 && (
                            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                                <h3 className="text-lg font-serif font-semibold mb-2">Manual Projects</h3>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                    {manualProjects.map(project => (
                                        <div key={project.id} className="border border-[var(--border-light)] rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">{project.name}</div>
                                                    <div className="text-xs">{project.description}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveManualProject(project.id)}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 flex justify-end">
                        <button
                            onClick={async () => {
                                await saveDraft()
                                setStep(2)
                            }}
                            disabled={selectedProjectIds.length === 0}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                        >
                            Continue to AI Analysis
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">AI Analysis</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Run AI scoring on selected projects or add your own highlights.
                                </p>
                            </div>
                            <button
                                onClick={handleAnalyzeSelected}
                                disabled={isAnalyzing || combinedSelectedProjects.apiProjects.length === 0}
                                className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50"
                            >
                                {isAnalyzing && analysisProgress
                                    ? `Analyzing ${analysisProgress.current}/${analysisProgress.total}`
                                    : 'Analyze Selected Projects'}
                            </button>
                        </div>
                        {isAnalyzing && analysisProgress && (
                            <div className="mt-4 space-y-2">
                                <div className="h-2 rounded-full bg-[var(--bg-warm)] overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--orange-primary)] transition-all"
                                        style={{
                                            width: `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                    {analysisProgress.current} of {analysisProgress.total} analyzed
                                    {analysisProgress.failed > 0 ? ` • ${analysisProgress.failed} failed` : ''}
                                </div>
                            </div>
                        )}
                        {analysisMessage && !isAnalyzing && (
                            <div className="mt-4 text-sm text-[var(--text-secondary)] bg-[var(--bg-warm)] border border-[var(--border-light)] rounded-lg px-4 py-3 flex items-center justify-between">
                                <span>{analysisMessage}</span>
                                <button
                                    onClick={() => setAnalysisMessage(null)}
                                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                        {resumeAnalysisNotice && !isAnalyzing && (
                            <div className="mt-4 text-sm text-[var(--text-secondary)] bg-[var(--orange-light)] border border-[var(--border-light)] rounded-lg px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <span>
                                    Analysis paused at {resumeAnalysisNotice.analyzed}/{resumeAnalysisNotice.total}. Resume to finish scoring.
                                </span>
                                <button
                                    onClick={async () => {
                                        setStep(2)
                                        await handleAnalyzeSelected()
                                    }}
                                    className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white text-xs font-semibold hover:bg-[var(--orange-hover)]"
                                >
                                    Resume Analysis
                                </button>
                            </div>
                        )}
                        {analysisCooldown > 0 && (
                            <div className="mt-2 text-xs text-[var(--text-secondary)]">
                                Rate limit cooldown: waiting {analysisCooldown}s before the next batch.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {combinedSelectedProjects.apiProjects.map(project => (
                            <div
                                key={project.id}
                                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{project.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                            {project.description || 'No description'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold">AI Match</div>
                                        <div className="text-2xl font-bold text-[var(--orange-primary)]">
                                            {typeof project.ai_score === 'number' ? `${project.ai_score}%` : 'Not scored'}
                                        </div>
                                    </div>
                                </div>
                                {project.ai_analysis_jsonb?.bulletPoints && (
                                    <ul className="mt-4 text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-1">
                                        {project.ai_analysis_jsonb.bulletPoints.slice(0, 3).map((bullet: string, i: number) => (
                                            <li key={i}>{bullet}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}

                        {combinedSelectedProjects.manual.map(project => (
                            <div
                                key={project.id}
                                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-semibold">{project.name}</h3>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveManualProject(project.id)}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">{project.description}</p>
                                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                    Manual Highlights
                                </div>
                                <textarea
                                    value={project.notes.join('\n')}
                                    onChange={(e) => {
                                        const updatedNotes = e.target.value.split('\n').filter(Boolean)
                                        const next = manualProjects.map(p => (
                                            p.id === project.id ? { ...p, notes: updatedNotes } : p
                                        ))
                                        setManualProjects(next)
                                        saveDraft({ manualProjects: next })
                                    }}
                                    placeholder="Add bullet points (one per line)"
                                    className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)] text-sm"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                        >
                            Back to Projects
                        </button>
                        <button
                            onClick={async () => {
                                await saveDraft()
                                setStep(3)
                            }}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                        >
                            Continue to Skills
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold">Skills</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Skills are generated automatically from your analyzed projects.
                                </p>
                            </div>
                        </div>
                        {skillsMessage && (
                            <div className="mt-3 text-xs text-[var(--text-secondary)]">
                                {skillsMessage}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-3">AI Suggested Skills</h3>
                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, i) => (
                                        <button
                                            key={`${skill}-${i}`}
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="px-3 py-1 rounded-full bg-[var(--orange-light)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-warm)]"
                                            title="Remove skill"
                                        >
                                            {skill} ×
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Skills will appear here after analysis, or we will auto-generate them from your selected projects.
                                </p>
                            )}
                            {skills.length > 0 && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2">
                                    Click a skill to remove it.
                                </p>
                            )}
                            {excludedSkills.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs text-[var(--text-secondary)] mb-2">Removed skills</div>
                                    <div className="flex flex-wrap gap-2">
                                        {excludedSkills.map((skill, i) => (
                                            <button
                                                key={`${skill}-removed-${i}`}
                                                onClick={() => handleRestoreSkill(skill)}
                                                className="px-3 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)] hover:bg-[var(--orange-light)]"
                                                title="Restore skill"
                                            >
                                                {skill} +
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-light)] shadow-sm">
                            <h3 className="text-lg font-serif font-semibold mb-3">Manual Skills</h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    placeholder="Add a skill"
                                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-warm)]"
                                />
                                <button
                                    onClick={handleAddManualSkill}
                                    disabled={isAddingSkill}
                                    className="px-4 py-2 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAddingSkill ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                            {filteredRoleSuggestions.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">
                                        Suggested for {roleTitle || 'this role'}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredRoleSuggestions.slice(0, 12).map((skill) => (
                                            <button
                                                key={`suggested-${skill}`}
                                                type="button"
                                                onClick={() => addManualSkill(skill)}
                                                disabled={isAddingSkill}
                                                className="px-3 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)] hover:bg-[var(--orange-light)] disabled:opacity-50"
                                            >
                                                {skill} +
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isAddingSkill && (
                                <div className="text-xs text-[var(--text-secondary)] -mt-2 mb-4">
                                    Saving skill...
                                </div>
                            )}
                            {manualSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {manualSkills.map(skill => (
                                        <button
                                            key={skill}
                                            onClick={() => {
                                                const next = manualSkills.filter(item => item !== skill)
                                                setManualSkills(next)
                                                saveDraft({ manualSkills: next })
                                            }}
                                            className="px-3 py-1 rounded-full bg-[var(--bg-warm)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)] hover:bg-[var(--orange-light)]"
                                        >
                                            {skill} ×
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Add any skills that should appear on your resume.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(2)}
                            className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-warm)]"
                        >
                            Back to Analysis
                        </button>
                        <button
                            onClick={async () => {
                                await saveDraft()
                                router.push('/builder')
                            }}
                            className="px-6 py-3 rounded-lg bg-[var(--orange-primary)] text-white font-semibold hover:bg-[var(--orange-hover)]"
                        >
                            Continue to Resume Builder
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
