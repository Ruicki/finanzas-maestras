
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const profiles = await prisma.profile.findMany({
        include: { categories: true }
    });

    if (profiles.length === 0) {
        console.log('No profiles found at all.');
    }

    for (const p of profiles) {
        console.log(`Profile: ${p.id} - ${p.name}`);
        console.log('Categories:', p.categories.map(c => `${c.id}: ${c.name}`).join(', '));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
