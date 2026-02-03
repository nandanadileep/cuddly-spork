import { PlatformProject } from '@/types'

export interface GitHubRepo {
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
    fork: boolean
}

export class GitHubClient {
    private accessToken?: string

    constructor(accessToken?: string) {
        this.accessToken = accessToken
    }

    async fetchUserRepositories(): Promise<PlatformProject[]> {
        try {
            // Use affiliation=owner to only get repos the user owns (not starred, collaborator, or org member repos)
            if (!this.accessToken) {
                throw new Error('GitHub access token is required to fetch user repositories')
            }
            const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`)
            }

            const repos: GitHubRepo[] = await response.json()

            // Filter out forks and convert to PlatformProject format
            return repos
                .filter(repo => !repo.fork)
                .map(repo => ({
                    externalId: repo.id.toString(),
                    name: repo.name,
                    description: repo.description,
                    url: repo.html_url,
                    technologies: [repo.language, ...repo.topics].filter(Boolean) as string[],
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language || undefined,
                    metadata: {
                        full_name: repo.full_name,
                        created_at: repo.created_at,
                        updated_at: repo.updated_at,
                        pushed_at: repo.pushed_at,
                    },
                }))
        } catch (error) {
            console.error('Error fetching GitHub repositories:', error)
            throw error
        }
    }

    async fetchRepositoryDetails(owner: string, repo: string): Promise<GitHubRepo> {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
                Accept: 'application/vnd.github.v3+json',
            },
        })

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`)
        }

        return response.json()
    }

    async fetchReadme(owner: string, repo: string): Promise<string | null> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
                headers: {
                    ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            if (response.status === 404) return null
            if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`)

            const data = await response.json()
            if (data.content && data.encoding === 'base64') {
                return Buffer.from(data.content, 'base64').toString('utf-8')
            }
            return null
        } catch (error) {
            console.error(`Error fetching README for ${owner}/${repo}:`, error)
            return null
        }
    }

    async fetchLanguages(owner: string, repo: string): Promise<string[]> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
                headers: {
                    ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            if (response.status === 404) return []
            if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`)

            const data = await response.json()
            return Object.keys(data || {})
        } catch (error) {
            console.error(`Error fetching languages for ${owner}/${repo}:`, error)
            return []
        }
    }

    async fetchFile(owner: string, repo: string, path: string): Promise<string | null> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
                headers: {
                    ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            if (response.status === 404) return null
            if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`)

            const data = await response.json()
            if (data?.content && data?.encoding === 'base64') {
                return Buffer.from(data.content, 'base64').toString('utf-8')
            }
            return null
        } catch (error) {
            console.error(`Error fetching file ${owner}/${repo}/${path}:`, error)
            return null
        }
    }

    static async getUserInfo(accessToken: string): Promise<{ login: string; email: string | null; name: string | null }> {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        })

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`)
        }

        const user = await response.json()
        return {
            login: user.login,
            email: user.email,
            name: user.name,
        }
    }
}
