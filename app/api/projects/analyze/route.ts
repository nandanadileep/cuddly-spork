import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeProject } from '@/lib/openai'
import { GitHubClient } from '@/lib/platforms/github'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectIds } = await req.json()

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'Project IDs required' }, { status: 400 })
        }

        // 1. Get user and target role analysis
        const userId = session.user.id || null
        const userEmail = session.user.email || null
        const userRecord = userId
            ? await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, target_role: true, job_description_jsonb: true },
            })
            : userEmail
                ? await prisma.user.findUnique({
                    where: { email: userEmail },
                    select: { id: true, target_role: true, job_description_jsonb: true },
                })
                : null

        if (!userRecord?.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const targetRole = userRecord?.target_role
        const jobAnalysis = (userRecord?.job_description_jsonb as any)?.analysis

        // 2. Get GitHub token if needed
        const githubConnection = await prisma.platformConnection.findUnique({
            where: {
                user_id_platform: {
                    user_id: userRecord.id,
                    platform: 'github'
                }
            }
        })

        // NOTE: In a real app, you'd decrypt the token. For this demo, we'll assume it's available or use public access.
        const githubToken = githubConnection?.access_token_encrypted || process.env.GITHUB_TOKEN // fallback to env token

        const githubClient = new GitHubClient(githubToken || undefined)

        // 3. Fetch projects to analyze
        const projects = await prisma.project.findMany({
            where: {
                id: { in: projectIds },
                user_id: userRecord.id
            }
        })

        const results = []

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

        const extractKeywordSkills = (text: string) => {
            const matches: string[] = []
            const lower = text.toLowerCase()
            keywordSkills.forEach((skill) => {
                if (lower.includes(skill.toLowerCase())) {
                    matches.push(skill)
                }
            })
            return matches
        }

        for (const project of projects) {
            try {
                const alreadyAnalyzedForRole =
                    (project.analyzed_for_role || null) === (targetRole || null) &&
                    project.ai_analysis_jsonb &&
                    project.ai_score !== null

                if (alreadyAnalyzedForRole) {
                    results.push({
                        id: project.id,
                        success: true,
                        score: project.ai_score,
                        cached: true
                    })
                    continue
                }

                let readmeContent = ''
                let languageHints: string[] = []
                let repoKeywordSkills: string[] = []

                // 4. Fetch README from GitHub if possible
                if (project.platform === 'github') {
                    const urlParts = project.url.split('/')
                    const owner = urlParts[urlParts.length - 2]
                    const repoName = urlParts[urlParts.length - 1]

                    if (owner && repoName) {
                        readmeContent = await githubClient.fetchReadme(owner, repoName) || ''
                        languageHints = await githubClient.fetchLanguages(owner, repoName)
                        const filesToScan = [
                            'package.json',
                            'requirements.txt',
                            'pyproject.toml',
                            'environment.yml',
                            'Pipfile',
                            'Pipfile.lock',
                            'poetry.lock',
                            'go.mod',
                            'Cargo.toml',
                            'composer.json',
                            'Gemfile',
                            'pom.xml',
                            'build.gradle',
                            'build.gradle.kts',
                            'package-lock.json',
                            'yarn.lock',
                            'pnpm-lock.yaml'
                        ]
                        const fileContents = await Promise.all(
                            filesToScan.map(async (path) => {
                                const content = await githubClient.fetchFile(owner, repoName, path)
                                return content || ''
                            })
                        )
                        const combined = fileContents.join('\n')
                        if (combined.trim()) {
                            repoKeywordSkills = extractKeywordSkills(combined)
                        }
                    }
                }

                const existingTechnologies = Array.isArray(project.technologies_jsonb)
                    ? (project.technologies_jsonb as string[])
                    : []
                const mergedTechnologies = Array.from(new Set([
                    ...existingTechnologies,
                    ...languageHints,
                    ...repoKeywordSkills
                ])).filter(Boolean)

                const hasNoSignal =
                    !(project.description || '').trim() &&
                    !readmeContent.trim() &&
                    mergedTechnologies.length === 0

                if (hasNoSignal) {
                    results.push({
                        id: project.id,
                        success: false,
                        error: 'Project has no README or description to analyze.'
                    })
                    continue
                }

                // 5. Run AI Analysis
                const analysis = await analyzeProject({
                    name: project.name,
                    description: (project.description || '').trim() || readmeContent,
                    language: project.language,
                    url: project.url,
                    stars: project.stars || 0,
                    technologies: mergedTechnologies,
                    targetRole: targetRole || undefined,
                    requiredSkills: jobAnalysis?.requiredSkills,
                    jobKeywords: jobAnalysis?.keywords
                })

                const analysisWithContext = {
                    ...analysis,
                    readme_excerpt: readmeContent ? readmeContent.slice(0, 2000) : null
                }

                // 6. Update Database
                const updatedProject = await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        ai_score: analysis.score,
                        ai_analysis_jsonb: analysisWithContext as any,
                        analyzed_for_role: targetRole,
                        technologies_jsonb: mergedTechnologies
                    }
                })

                results.push({
                    id: project.id,
                    success: true,
                    score: analysis.score
                })
            } catch (err) {
                console.error(`Error analyzing project ${project.id}:`, err)
                results.push({
                    id: project.id,
                    success: false,
                    error: err instanceof Error ? err.message : 'Analysis failed'
                })
            }
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (error) {
        console.error('[Project Analysis] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
