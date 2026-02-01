import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { analyzeProject, GeneratedJobDescription } from '@/lib/openai'

// Comprehensive language/technology relevance mapping for different roles
// Each role maps to ALL relevant technologies that would be valuable
const ROLE_LANGUAGE_MAP: Record<string, string[]> = {
    // Backend Engineering
    'backend': [
        'python', 'java', 'go', 'golang', 'rust', 'node', 'nodejs', 'typescript',
        'javascript', 'ruby', 'c#', 'csharp', 'dotnet', '.net', 'php', 'kotlin',
        'scala', 'elixir', 'erlang', 'haskell', 'clojure', 'perl', 'c++', 'cpp',
        'spring', 'django', 'flask', 'fastapi', 'express', 'nestjs', 'rails',
        'laravel', 'gin', 'echo', 'fiber', 'actix', 'rocket', 'axum',
        'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
        'dynamodb', 'sqlite', 'mariadb', 'oracle', 'sql server', 'neo4j',
        'graphql', 'rest', 'grpc', 'protobuf', 'kafka', 'rabbitmq', 'redis',
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'lambda', 'serverless'
    ],

    // Frontend Engineering  
    'frontend': [
        'javascript', 'typescript', 'html', 'css', 'scss', 'sass', 'less',
        'react', 'reactjs', 'vue', 'vuejs', 'angular', 'angularjs', 'svelte',
        'next', 'nextjs', 'nuxt', 'nuxtjs', 'gatsby', 'remix', 'astro',
        'webpack', 'vite', 'parcel', 'rollup', 'esbuild', 'babel',
        'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui', 'chakra',
        'styled-components', 'emotion', 'css-in-js', 'postcss',
        'redux', 'mobx', 'zustand', 'recoil', 'jotai', 'pinia', 'vuex',
        'jest', 'vitest', 'cypress', 'playwright', 'testing-library', 'storybook',
        'd3', 'd3js', 'three', 'threejs', 'canvas', 'webgl', 'svg',
        'figma', 'framer', 'animation', 'gsap', 'lottie'
    ],

    // Full Stack Engineering
    'fullstack': [
        'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'ruby',
        'php', 'c#', 'csharp', 'html', 'css', 'scss', 'sass',
        'react', 'vue', 'angular', 'svelte', 'next', 'nextjs', 'nuxt',
        'node', 'nodejs', 'express', 'nestjs', 'django', 'flask', 'fastapi',
        'rails', 'laravel', 'spring', 'dotnet', '.net',
        'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
        'graphql', 'rest', 'prisma', 'typeorm', 'sequelize', 'mongoose',
        'docker', 'aws', 'vercel', 'netlify', 'heroku', 'firebase'
    ],

    // Mobile Development
    'mobile': [
        'swift', 'swiftui', 'objective-c', 'objectivec', 'ios', 'uikit',
        'kotlin', 'java', 'android', 'jetpack', 'compose', 'jetpack compose',
        'react native', 'reactnative', 'expo',
        'flutter', 'dart',
        'xamarin', 'maui', '.net maui',
        'ionic', 'cordova', 'capacitor',
        'nativescript',
        'core data', 'realm', 'sqlite', 'room',
        'firebase', 'push notifications', 'in-app purchases',
        'xcode', 'android studio', 'cocoapods', 'gradle'
    ],

    // DevOps / SRE / Platform Engineering
    'devops': [
        'python', 'go', 'golang', 'bash', 'shell', 'powershell',
        'docker', 'dockerfile', 'podman', 'containerd',
        'kubernetes', 'k8s', 'helm', 'kustomize', 'istio', 'linkerd',
        'terraform', 'hcl', 'pulumi', 'crossplane', 'cdktf',
        'ansible', 'puppet', 'chef', 'salt', 'saltstack',
        'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis',
        'argocd', 'flux', 'spinnaker', 'tekton',
        'prometheus', 'grafana', 'datadog', 'new relic', 'splunk',
        'elk', 'elasticsearch', 'logstash', 'kibana', 'fluentd', 'loki',
        'aws', 'azure', 'gcp', 'cloudflare', 'digitalocean', 'linode',
        'nginx', 'apache', 'haproxy', 'traefik', 'envoy',
        'vault', 'consul', 'etcd', 'zookeeper',
        'linux', 'ubuntu', 'centos', 'debian', 'rhel', 'alpine'
    ],

    // Site Reliability Engineering
    'sre': [
        'python', 'go', 'golang', 'bash', 'shell',
        'kubernetes', 'k8s', 'docker', 'terraform', 'ansible',
        'prometheus', 'grafana', 'alertmanager', 'pagerduty', 'opsgenie',
        'datadog', 'new relic', 'dynatrace', 'splunk',
        'elk', 'loki', 'jaeger', 'zipkin', 'opentelemetry',
        'aws', 'azure', 'gcp', 'cloudflare',
        'chaos engineering', 'chaos monkey', 'litmus',
        'slo', 'sli', 'error budget', 'incident management'
    ],

    // Platform Engineering
    'platform': [
        'python', 'go', 'golang', 'rust', 'typescript',
        'kubernetes', 'k8s', 'docker', 'helm', 'kustomize',
        'terraform', 'pulumi', 'crossplane', 'backstage',
        'argocd', 'flux', 'gitops',
        'aws', 'azure', 'gcp', 'cloudflare',
        'postgresql', 'mysql', 'redis', 'kafka',
        'vault', 'consul', 'kong', 'istio'
    ],

    // Data Engineering
    'data': [
        'python', 'scala', 'java', 'sql', 'r', 'julia',
        'spark', 'pyspark', 'hadoop', 'hive', 'presto', 'trino',
        'airflow', 'dagster', 'prefect', 'luigi', 'dbt',
        'kafka', 'kinesis', 'flink', 'beam', 'storm',
        'snowflake', 'redshift', 'bigquery', 'databricks', 'delta lake',
        'postgresql', 'mysql', 'mongodb', 'cassandra', 'clickhouse',
        'pandas', 'numpy', 'polars', 'dask', 'vaex',
        'parquet', 'avro', 'orc', 'json', 'csv',
        'aws', 'azure', 'gcp', 's3', 'glue', 'athena',
        'metabase', 'looker', 'tableau', 'superset', 'power bi'
    ],

    // Machine Learning / AI Engineering
    'ml': [
        'python', 'r', 'julia', 'scala', 'cpp', 'c++',
        'tensorflow', 'pytorch', 'keras', 'jax', 'flax',
        'scikit-learn', 'sklearn', 'xgboost', 'lightgbm', 'catboost',
        'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly',
        'jupyter', 'notebook', 'colab',
        'huggingface', 'transformers', 'bert', 'gpt', 'llm', 'nlp',
        'opencv', 'pillow', 'computer vision', 'image processing',
        'mlflow', 'wandb', 'weights and biases', 'neptune', 'comet',
        'kubeflow', 'mlops', 'feature store', 'feast',
        'onnx', 'tensorrt', 'triton', 'sagemaker', 'vertex ai',
        'cuda', 'gpu', 'tpu', 'distributed training'
    ],

    // AI / LLM / GenAI Engineering
    'ai': [
        'python', 'typescript', 'javascript',
        'openai', 'gpt', 'claude', 'anthropic', 'llama', 'mistral', 'gemini',
        'langchain', 'llamaindex', 'llama-index', 'semantic kernel',
        'huggingface', 'transformers', 'diffusers',
        'rag', 'retrieval', 'vector', 'embeddings', 'pinecone', 'weaviate',
        'chroma', 'chromadb', 'faiss', 'milvus', 'qdrant',
        'prompt', 'fine-tuning', 'lora', 'qlora', 'peft',
        'agents', 'autogen', 'crewai', 'function calling', 'tool use',
        'stable diffusion', 'midjourney', 'dalle', 'image generation',
        'whisper', 'speech', 'tts', 'stt', 'voice'
    ],

    // Data Science
    'science': [
        'python', 'r', 'julia', 'sql', 'matlab', 'stata', 'sas',
        'pandas', 'numpy', 'scipy', 'statsmodels',
        'scikit-learn', 'sklearn', 'xgboost', 'lightgbm',
        'matplotlib', 'seaborn', 'plotly', 'bokeh', 'altair',
        'jupyter', 'notebook', 'rstudio',
        'statistics', 'statistical', 'hypothesis', 'regression', 'classification',
        'a/b testing', 'experimentation', 'causal inference',
        'tableau', 'power bi', 'looker', 'metabase'
    ],

    // Security Engineering
    'security': [
        'python', 'go', 'golang', 'rust', 'c', 'c++', 'cpp', 'bash', 'shell',
        'assembly', 'asm', 'reverse engineering', 'ida', 'ghidra',
        'burp', 'owasp', 'nmap', 'wireshark', 'metasploit',
        'cryptography', 'encryption', 'ssl', 'tls', 'jwt', 'oauth',
        'aws security', 'azure security', 'gcp security', 'iam',
        'vault', 'secrets management', 'key management',
        'siem', 'splunk', 'elastic security', 'chronicle',
        'docker', 'kubernetes', 'container security', 'falco', 'trivy',
        'terraform', 'infrastructure as code', 'policy as code', 'opa',
        'soc', 'incident response', 'forensics', 'threat hunting',
        'penetration testing', 'vulnerability', 'cve', 'exploit'
    ],

    // Cloud Engineering
    'cloud': [
        'python', 'go', 'golang', 'typescript', 'bash', 'shell',
        'aws', 'amazon web services', 'ec2', 's3', 'lambda', 'rds', 'dynamodb',
        'ecs', 'eks', 'fargate', 'cloudformation', 'cdk', 'sam',
        'azure', 'azure functions', 'aks', 'cosmos db', 'arm', 'bicep',
        'gcp', 'google cloud', 'cloud run', 'gke', 'bigquery', 'firestore',
        'terraform', 'pulumi', 'crossplane', 'cloudformation',
        'kubernetes', 'k8s', 'docker', 'helm',
        'serverless', 'faas', 'lambda', 'azure functions', 'cloud functions'
    ],

    // Blockchain / Web3
    'blockchain': [
        'solidity', 'rust', 'move', 'vyper', 'cairo',
        'ethereum', 'bitcoin', 'solana', 'polygon', 'avalanche', 'arbitrum',
        'hardhat', 'foundry', 'truffle', 'anchor', 'brownie',
        'web3', 'web3js', 'ethersjs', 'ethers', 'wagmi', 'viem',
        'erc20', 'erc721', 'nft', 'defi', 'smart contract',
        'ipfs', 'arweave', 'the graph', 'chainlink', 'oracle',
        'metamask', 'wallet', 'crypto', 'blockchain'
    ],

    // Game Development
    'game': [
        'c++', 'cpp', 'c#', 'csharp', 'rust', 'lua', 'gdscript',
        'unity', 'unreal', 'unreal engine', 'godot', 'gamemaker',
        'opengl', 'vulkan', 'directx', 'metal', 'webgl',
        'shader', 'hlsl', 'glsl', 'graphics', 'rendering',
        'physics', 'collision', 'pathfinding', 'ai',
        'multiplayer', 'networking', 'photon', 'mirror',
        'mobile games', 'pc games', 'console'
    ],

    // Embedded / IoT Engineering
    'embedded': [
        'c', 'c++', 'cpp', 'rust', 'assembly', 'asm',
        'arduino', 'raspberry pi', 'esp32', 'esp8266', 'stm32',
        'rtos', 'freertos', 'zephyr', 'mbed',
        'mqtt', 'coap', 'bluetooth', 'ble', 'zigbee', 'lorawan',
        'i2c', 'spi', 'uart', 'can', 'gpio',
        'firmware', 'microcontroller', 'mcu', 'soc',
        'pcb', 'electronics', 'hardware'
    ],

    // QA / Test Engineering
    'qa': [
        'python', 'java', 'javascript', 'typescript', 'ruby',
        'selenium', 'webdriver', 'playwright', 'cypress', 'puppeteer',
        'appium', 'espresso', 'xcuitest',
        'jest', 'mocha', 'pytest', 'junit', 'testng', 'rspec',
        'postman', 'newman', 'rest assured', 'api testing',
        'jmeter', 'k6', 'locust', 'gatling', 'performance testing',
        'cucumber', 'behave', 'bdd', 'gherkin',
        'testrail', 'jira', 'zephyr', 'testlink',
        'jenkins', 'github actions', 'ci/cd'
    ],

    // Technical Writer / Documentation
    'technical': [
        'markdown', 'mdx', 'asciidoc', 'rst', 'restructuredtext',
        'docusaurus', 'mkdocs', 'sphinx', 'gitbook', 'readme',
        'swagger', 'openapi', 'api documentation',
        'jsdoc', 'typedoc', 'pydoc', 'javadoc',
        'diagrams', 'mermaid', 'plantuml', 'lucidchart', 'draw.io'
    ],
}

interface ProjectFilterResult {
    project: any
    shouldAnalyze: boolean
    skipReason?: string
    autoScore?: number
}

/**
 * Pre-filter projects before sending to AI
 * Returns filtered projects and auto-scores for skipped ones
 * Note: Forks are already filtered out during GitHub sync
 */
function preFilterProject(project: any, targetRole: string | null, jobKeywords: string[] | null): ProjectFilterResult {
    // 1. Check if project is empty (no description, no language, no stars)
    const hasDescription = project.description && project.description.trim().length > 10
    const hasLanguage = project.language && project.language.trim().length > 0
    const hasTechnologies = project.technologies_jsonb && (project.technologies_jsonb as string[]).length > 0

    if (!hasDescription && !hasLanguage && !hasTechnologies && (project.stars || 0) === 0) {
        return {
            project,
            shouldAnalyze: false,
            skipReason: 'empty_project',
            autoScore: 5, // Very low score for empty projects
        }
    }

    // 3. Check language relevance (only if target role is set)
    if (targetRole && project.language) {
        const roleLower = targetRole.toLowerCase()
        const projectLang = project.language.toLowerCase()

        // Find matching role category
        let relevantLanguages: string[] = []
        for (const [role, langs] of Object.entries(ROLE_LANGUAGE_MAP)) {
            if (roleLower.includes(role)) {
                relevantLanguages = [...relevantLanguages, ...langs]
            }
        }

        // If we found relevant languages and project language doesn't match
        if (relevantLanguages.length > 0) {
            const isRelevant = relevantLanguages.some(lang =>
                projectLang.includes(lang) || lang.includes(projectLang)
            )

            if (!isRelevant) {
                // Check if project technologies contain any relevant keywords
                const techStack = (project.technologies_jsonb as string[]) || []
                const techRelevant = techStack.some(tech =>
                    relevantLanguages.some(lang => tech.toLowerCase().includes(lang))
                )

                // Also check against job keywords if available
                const keywordMatch = jobKeywords?.some(keyword =>
                    techStack.some(tech => tech.toLowerCase().includes(keyword.toLowerCase())) ||
                    (project.description || '').toLowerCase().includes(keyword.toLowerCase())
                )

                if (!techRelevant && !keywordMatch) {
                    return {
                        project,
                        shouldAnalyze: false,
                        skipReason: 'language_not_relevant',
                        autoScore: 25, // Low score but not zero
                    }
                }
            }
        }
    }

    // 4. Check for minimal content projects
    const descLen = (project.description || '').length
    if (descLen < 20 && (project.stars || 0) === 0 && !hasTechnologies) {
        return {
            project,
            shouldAnalyze: false,
            skipReason: 'minimal_content',
            autoScore: 15,
        }
    }

    // Project passes all filters - send to AI
    return {
        project,
        shouldAnalyze: true,
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectIds } = await req.json()

        if (!projectIds || !Array.isArray(projectIds)) {
            return NextResponse.json(
                { error: 'projectIds array required' },
                { status: 400 }
            )
        }

        // Fetch user's target role (handle missing column gracefully)
        let targetRole: string | null = null
        let jobDescription: GeneratedJobDescription | null = null

        try {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { target_role: true },
            })
            targetRole = user?.target_role || null
        } catch {
            // Column may not exist yet
        }

        // Get projects that need analysis (don't have ai_score yet)
        const projects = await prisma.project.findMany({
            where: {
                id: { in: projectIds },
                user_id: session.user.id,
                ai_score: null, // Only analyze unanalyzed projects
            },
        })

        const analyzedProjects = []
        const skippedProjects = []
        let failed = 0
        let aiCallsAvoided = 0

        for (const project of projects) {
            // Pre-filter the project
            const filterResult = preFilterProject(
                project,
                targetRole,
                jobDescription?.keywords || null
            )

            if (!filterResult.shouldAnalyze) {
                // Skip AI call - use auto-generated score
                console.log(`⏭️  Skipping AI for "${project.name}": ${filterResult.skipReason}`)
                aiCallsAvoided++

                try {
                    // Update with auto-score and reason
                    const updatedProject = await prisma.project.update({
                        where: { id: project.id },
                        data: {
                            ai_score: filterResult.autoScore || 10,
                            ai_analysis_jsonb: {
                                score: filterResult.autoScore || 10,
                                techStack: (project.technologies_jsonb as string[]) || [],
                                summary: generateAutoSummary(project, filterResult.skipReason || ''),
                                strengths: [],
                                improvements: ['Add more documentation', 'Expand project scope'],
                                bulletPoints: [],
                                reasoning: getSkipReasonMessage(filterResult.skipReason || ''),
                                autoAnalyzed: true,
                                skipReason: filterResult.skipReason,
                            },
                        },
                    })
                    skippedProjects.push(updatedProject)
                } catch (error) {
                    console.error(`Failed to auto-score project ${project.id}:`, error)
                    failed++
                }
                continue
            }

            // Send to AI for analysis
            try {
                console.log(`🤖 Analyzing with AI: "${project.name}"`)

                const analysis = await analyzeProject({
                    name: project.name,
                    description: project.description || '',
                    technologies: (project.technologies_jsonb as string[]) || [],
                    url: project.url || '',
                    language: project.language,
                    stars: project.stars || undefined,
                    targetRole: targetRole || undefined,
                    jobKeywords: jobDescription?.keywords || undefined,
                    requiredSkills: jobDescription?.requiredSkills || undefined,
                })

                // Update project with AI analysis
                const updatedProject = await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        ai_score: analysis.score,
                        ai_analysis_jsonb: analysis,
                    },
                })

                analyzedProjects.push(updatedProject)
            } catch (error) {
                console.error(`Failed to analyze project ${project.id}:`, error)
                failed++
            }
        }

        console.log(`📊 Analysis complete: ${analyzedProjects.length} AI analyzed, ${aiCallsAvoided} auto-scored, ${failed} failed`)

        return NextResponse.json({
            success: true,
            analyzed: analyzedProjects.length,
            autoScored: skippedProjects.length,
            skipped: projectIds.length - projects.length, // Already analyzed
            failed,
            aiCallsAvoided,
            targetRole,
        })
    } catch (error) {
        console.error('Error analyzing projects:', error)
        return NextResponse.json(
            { error: 'Failed to analyze projects' },
            { status: 500 }
        )
    }
}

function generateAutoSummary(project: any, skipReason: string): string {
    const name = project.name || 'This project'
    switch (skipReason) {
        case 'fork_no_contributions':
            return `${name} is a forked repository without significant contributions.`
        case 'empty_project':
            return `${name} has minimal content and needs more development.`
        case 'language_not_relevant':
            return `${name} uses technologies not directly aligned with the target role.`
        case 'minimal_content':
            return `${name} is a small project with limited scope.`
        default:
            return `${name} requires further development for resume inclusion.`
    }
}

function getSkipReasonMessage(skipReason: string): string {
    switch (skipReason) {
        case 'fork_no_contributions':
            return 'Forked repository without meaningful contributions - not suitable for resume.'
        case 'empty_project':
            return 'Empty or minimal project - needs more development to be resume-worthy.'
        case 'language_not_relevant':
            return 'Project language/stack does not align with target role requirements.'
        case 'minimal_content':
            return 'Project has minimal content - consider expanding scope or documentation.'
        default:
            return 'Auto-scored based on project characteristics.'
    }
}
