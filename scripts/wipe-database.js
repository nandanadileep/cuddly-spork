const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('️  Starting database cleanup...')

    // Delete in order to respect foreign key constraints
    console.log('Deleting resumes...')
    await prisma.resume.deleteMany({})

    console.log('Deleting projects...')
    await prisma.project.deleteMany({})

    console.log('Deleting platform connections...')
    await prisma.platformConnection.deleteMany({})

    console.log('Deleting users...')
    await prisma.user.deleteMany({})

console.log('Database wiped successfully!')
    console.log('All users, projects, resumes, and connections have been removed.')
}

main()
    .catch((e) => {
console.error('Error wiping database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
