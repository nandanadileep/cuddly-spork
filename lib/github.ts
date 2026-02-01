import { Octokit } from '@octokit/rest'

export interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string | null
    html_url: string
    language: string | null
    stargazers_count: number
    forks_count: number
    topics: string[]
    created_at: string
    updated_at: string
    pushed_at: string
    private: boolean
}

/**
 * Create GitHub API client with access token
 */
export function createGitHubClient(accessToken: string) {
    return new Octokit({
        auth: accessToken,
    })
}

/**
 * Fetch all repositories for authenticated user
 */
export async function fetchUserRepositories(
    accessToken: string,
    options: {
        includePrivate?: boolean
        sort?: 'created' | 'updated' | 'pushed' | 'full_name'
        perPage?: number
    } = {}
): Promise<GitHubRepo[]> {
    const octokit = createGitHubClient(accessToken)

    const { includePrivate = false, sort = 'updated', perPage = 100 } = options

    try {
        const response = await octokit.repos.listForAuthenticatedUser({
            visibility: includePrivate ? 'all' : 'public',
            sort,
            per_page: perPage,
            affiliation: 'owner',
        })

        return response.data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            topics: repo.topics || [],
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            private: repo.private,
        }))
    } catch (error) {
        console.error('GitHub API error:', error)
        throw new Error('Failed to fetch repositories from GitHub')
    }
}

/**
 * Fetch README content for a repository
 */
export async function fetchRepositoryReadme(
    accessToken: string,
    owner: string,
    repo: string
): Promise<string | null> {
    const octokit = createGitHubClient(accessToken)

    try {
        const response = await octokit.repos.getReadme({
            owner,
            repo,
        })

        // Decode base64 content
        const content = Buffer.from(response.data.content, 'base64').toString(
            'utf-8'
        )
        return content
    } catch (error) {
        // README might not exist
        return null
    }
}

/**
 * Fetch repository languages
 */
export async function fetchRepositoryLanguages(
    accessToken: string,
    owner: string,
    repo: string
): Promise<Record<string, number>> {
    const octokit = createGitHubClient(accessToken)

    try {
        const response = await octokit.repos.listLanguages({
            owner,
            repo,
        })

        return response.data
    } catch (error) {
        return {}
    }
}
