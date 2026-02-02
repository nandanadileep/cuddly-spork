const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const projects = await prisma.project.findMany({
        where: {
            OR: [
                { ai_score: { not: null } },
                { is_selected: true }
            ]
        },
        select: {
            id: true,
            name: true,
            ai_score: true,
            is_selected: true
        }
    });
    console.log(JSON.stringify(projects, null, 2));
    await prisma.$disconnect();
}

check().catch(e => {
    console.error(e);
    process.exit(1);
});
