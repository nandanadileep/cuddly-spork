import { Redis } from '@upstash/redis'

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key)
        return cached as T | null
    } catch (error) {
        console.error('Redis get error:', error)
        return null
    }
}

export async function setCache(key: string, value: any, expirationSeconds: number = 3600): Promise<void> {
    try {
        await redis.setex(key, expirationSeconds, JSON.stringify(value))
    } catch (error) {
        console.error('Redis set error:', error)
    }
}

export async function deleteCache(key: string): Promise<void> {
    try {
        await redis.del(key)
    } catch (error) {
        console.error('Redis delete error:', error)
    }
}
