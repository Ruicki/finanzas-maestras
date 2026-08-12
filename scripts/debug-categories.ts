
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const profile = await prisma.profile.findFirst();
    if (!profile) {
        console.log('No profile found');
        return;
    }

    const categories = await prisma.category.findMany({
        where: { profileId: profile.id }
    });

    console.log('Categories found:', categories.map(c => `${c.id}: ${c.name} (${c.type})`));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
