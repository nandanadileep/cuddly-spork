// GitHub API service for fetching user repositories

interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string | null
    html_url: string
    stargazers_count: number
    forks_count: number
    language: string | null
    topics: string[]
    created_at: string
    updated_at: string
    pushed_at: string
}

interface FetchReposResult {
    success: boolean
    repos?: GitHubRepo[]
    error?: string
    rateLimit?: {
        remaining: number
        reset: number
    }
}

/**
 * Fetch all public repositories for a GitHub username
 */
export async function fetchGitHubRepos(username: string): Promise<FetchReposResult> {
    try {
        const repos: GitHubRepo[] = []
        let page = 1
        const perPage = 100 // Max allowed by GitHub

        // Fetch all pages of repos
        while (true) {
            const url = `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated`

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'GitHire-App'
                }
            })

            // Check rate limits
            const rateLimit = {
                remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
                reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0')
            }

            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'GitHub user not found' }
                }
                if (response.status === 403) {
                    return {
                        success: false,
                        error: 'GitHub API rate limit exceeded',
                        rateLimit
                    }
                }
                return { success: false, error: `GitHub API error: ${response.statusText}` }
            }

            const pageRepos: GitHubRepo[] = await response.json()

            if (pageRepos.length === 0) {
                break // No more repos
            }

            repos.push(...pageRepos)

            // If we got less than perPage, we're done
            if (pageRepos.length < perPage) {
                break
            }

            page++

            // Safety limit: max 500 repos
            if (repos.length >= 500) {
                break
            }
        }

        return { success: true, repos }
    } catch (error) {
        console.error('GitHub API error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Extract technologies from a GitHub repo
 */
export function extractTechnologies(repo: GitHubRepo): string[] {
    const technologies: string[] = []

    // Add primary language
    if (repo.language) {
        technologies.push(repo.language)
    }

    // Add topics (GitHub tags)
    if (repo.topics && repo.topics.length > 0) {
        technologies.push(...repo.topics)
    }

    return technologies
}
