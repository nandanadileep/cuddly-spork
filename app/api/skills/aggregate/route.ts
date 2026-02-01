import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// Skill categories for classification
const SKILL_CATEGORIES = {
    languages: [
        'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'ruby',
        'c', 'c++', 'cpp', 'c#', 'csharp', 'php', 'swift', 'kotlin', 'scala', 'r',
        'julia', 'elixir', 'erlang', 'haskell', 'clojure', 'perl', 'lua', 'dart',
        'objective-c', 'shell', 'bash', 'powershell', 'sql', 'html', 'css', 'scss', 'sass'
    ],
    frameworks: [
        'react', 'reactjs', 'vue', 'vuejs', 'angular', 'angularjs', 'svelte', 'next', 'nextjs',
        'nuxt', 'nuxtjs', 'gatsby', 'remix', 'astro', 'express', 'nestjs', 'fastify',
        'django', 'flask', 'fastapi', 'spring', 'springboot', 'rails', 'laravel', 'symfony',
        'gin', 'echo', 'fiber', 'actix', 'rocket', 'axum', 'phoenix',
        'flutter', 'react native', 'expo', 'electron', 'tauri',
        'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui', 'chakra',
        'redux', 'mobx', 'zustand', 'recoil', 'pinia', 'vuex'
    ],
    databases: [
        'postgresql', 'postgres', 'mysql', 'mariadb', 'mongodb', 'redis', 'sqlite',
        'elasticsearch', 'cassandra', 'dynamodb', 'firestore', 'firebase',
        'neo4j', 'oracle', 'sql server', 'mssql', 'clickhouse', 'timescaledb',
        'supabase', 'planetscale', 'cockroachdb', 'yugabyte'
    ],
    cloud: [
        'aws', 'amazon web services', 'azure', 'gcp', 'google cloud',
        'vercel', 'netlify', 'heroku', 'digitalocean', 'linode', 'cloudflare',
        'lambda', 'ec2', 's3', 'rds', 'eks', 'ecs', 'fargate',
        'azure functions', 'aks', 'cosmos db',
        'cloud run', 'gke', 'bigquery', 'cloud functions'
    ],
    devops: [
        'docker', 'kubernetes', 'k8s', 'helm', 'terraform', 'ansible', 'puppet', 'chef',
        'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis',
        'argocd', 'flux', 'prometheus', 'grafana', 'datadog', 'splunk',
        'nginx', 'apache', 'traefik', 'envoy', 'istio', 'linkerd',
        'vault', 'consul', 'etcd'
    ],
    tools: [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
        'webpack', 'vite', 'parcel', 'rollup', 'esbuild', 'babel',
        'jest', 'mocha', 'pytest', 'junit', 'cypress', 'playwright', 'selenium',
        'postman', 'insomnia', 'swagger', 'openapi',
        'figma', 'sketch', 'adobe xd',
        'vs code', 'intellij', 'vim', 'neovim'
    ],
    ai_ml: [
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy',
        'jupyter', 'huggingface', 'transformers', 'langchain', 'openai', 'gpt',
        'opencv', 'spacy', 'nltk', 'mlflow', 'kubeflow', 'sagemaker', 'vertex ai'
    ]
}

interface SkillCount {
    name: string
    count: number
    category: string
}

function categorizeSkill(skill: string): string {
    const skillLower = skill.toLowerCase()

    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
        if (skills.some(s => skillLower.includes(s) || s.includes(skillLower))) {
            return category
        }
    }

    return 'other'
}

function normalizeSkillName(skill: string): string {
    // Normalize common variations
    const normalizations: Record<string, string> = {
        'reactjs': 'React',
        'react': 'React',
        'vuejs': 'Vue.js',
        'vue': 'Vue.js',
        'nextjs': 'Next.js',
        'next': 'Next.js',
        'nodejs': 'Node.js',
        'node': 'Node.js',
        'typescript': 'TypeScript',
        'javascript': 'JavaScript',
        'python': 'Python',
        'golang': 'Go',
        'go': 'Go',
        'postgresql': 'PostgreSQL',
        'postgres': 'PostgreSQL',
        'mongodb': 'MongoDB',
        'redis': 'Redis',
        'docker': 'Docker',
        'kubernetes': 'Kubernetes',
        'k8s': 'Kubernetes',
        'aws': 'AWS',
        'gcp': 'GCP',
        'azure': 'Azure',
        'tensorflow': 'TensorFlow',
        'pytorch': 'PyTorch',
        'tailwind': 'Tailwind CSS',
        'tailwindcss': 'Tailwind CSS',
    }

    const lower = skill.toLowerCase()
    return normalizations[lower] || skill
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all analyzed projects with their tech stacks
        const projects = await prisma.project.findMany({
            where: {
                user_id: session.user.id,
                ai_score: { not: null }, // Only analyzed projects
            },
            select: {
                id: true,
                name: true,
                technologies_jsonb: true,
                ai_analysis_jsonb: true,
                is_selected: true,
            },
        })

        // Aggregate skills from both technologies_jsonb and ai_analysis_jsonb.techStack
        const skillCounts: Map<string, { count: number; fromSelected: number }> = new Map()

        for (const project of projects) {
            const techs = (project.technologies_jsonb as string[]) || []
            const aiAnalysis = project.ai_analysis_jsonb as any
            const aiTechStack = aiAnalysis?.techStack || []

            // Combine both sources
            const allSkills = [...new Set([...techs, ...aiTechStack])]

            for (const skill of allSkills) {
                if (!skill || typeof skill !== 'string') continue

                const normalized = normalizeSkillName(skill)
                const existing = skillCounts.get(normalized) || { count: 0, fromSelected: 0 }

                skillCounts.set(normalized, {
                    count: existing.count + 1,
                    fromSelected: existing.fromSelected + (project.is_selected ? 1 : 0),
                })
            }
        }

        // Convert to array and categorize
        const skills: SkillCount[] = []

        skillCounts.forEach((data, name) => {
            skills.push({
                name,
                count: data.count,
                category: categorizeSkill(name),
            })
        })

        // Sort by count (most frequent first)
        skills.sort((a, b) => b.count - a.count)

        // Group by category
        const categorized = {
            languages: skills.filter(s => s.category === 'languages'),
            frameworks: skills.filter(s => s.category === 'frameworks'),
            databases: skills.filter(s => s.category === 'databases'),
            cloud: skills.filter(s => s.category === 'cloud'),
            devops: skills.filter(s => s.category === 'devops'),
            tools: skills.filter(s => s.category === 'tools'),
            ai_ml: skills.filter(s => s.category === 'ai_ml'),
            other: skills.filter(s => s.category === 'other'),
        }

        return NextResponse.json({
            success: true,
            totalProjects: projects.length,
            selectedProjects: projects.filter(p => p.is_selected).length,
            skills: categorized,
            topSkills: skills.slice(0, 20), // Top 20 overall
        })
    } catch (error) {
        console.error('Error aggregating skills:', error)
        return NextResponse.json(
            { error: 'Failed to aggregate skills' },
            { status: 500 }
        )
    }
}
