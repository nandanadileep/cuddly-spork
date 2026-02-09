const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const args = process.argv.slice(2)
    const deleteMode = args.includes('--delete')
    const emails = args.filter((arg) => !arg.startsWith('--'))

    if (emails.length === 0) {
        console.error('Usage: node scripts/anonymize-users.js <email1> <email2> [--delete]')
        process.exit(1)
    }

    for (const rawEmail of emails) {
        const normalized = rawEmail.trim().toLowerCase()
        if (!normalized) continue

        const user = await prisma.user.findFirst({
            where: { email: { equals: normalized, mode: 'insensitive' } },
            select: { id: true, email: true },
        })

        if (!user) {
            console.log('User not found:', rawEmail)
            continue
        }

        if (deleteMode) {
            await prisma.user.delete({ where: { id: user.id } })
            console.log('Deleted user:', user.email)
            continue
        }

        const anonymizedEmail = `deleted+${user.id}@example.invalid`
        await prisma.user.update({
            where: { id: user.id },
            data: {
                email: anonymizedEmail,
                name: null,
                password_hash: null,
                phone: null,
                location: null,
                website: null,
                linkedin_url: null,
                email_verified_at: null,
                email_verification_token: null,
                email_verification_expires: null,
                password_reset_token: null,
                password_reset_expires: null,
            },
        })
        console.log('Anonymized user:', user.email, '->', anonymizedEmail)
    }
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
