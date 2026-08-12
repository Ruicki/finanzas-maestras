
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const profiles = await prisma.profile.findMany({
        include: { categories: true }
    });

    for (const p of profiles) {
        console.log(`Checking profile ${p.name} (${p.id})...`);

        // Find "Home" and "Vivienda"
        // Case insensitive search might be safer, but let's stick to known issue "Home"
        const homeCat = p.categories.find(c => c.name.toLowerCase() === 'home');
        const viviendaCat = p.categories.find(c => c.name.toLowerCase() === 'vivienda');

        if (homeCat && viviendaCat) {
            console.log(`Found duplicate categories in profile ${p.name}: Home (${homeCat.id}) and Vivienda (${viviendaCat.id})`);

            // Move expenses
            const result = await prisma.expense.updateMany({
                where: { categoryId: homeCat.id },
                data: { categoryId: viviendaCat.id }
            });
            console.log(`Moved ${result.count} expenses from Home to Vivienda.`);

            // Delete Home
            await prisma.category.delete({
                where: { id: homeCat.id }
            });
            console.log(`Deleted category Home (${homeCat.id}).`);

        } else if (homeCat && !viviendaCat) {
            // If only Home exists, rename it to Vivienda
            console.log(`Found only Home (${homeCat.id}). Renaming to Vivienda.`);
            await prisma.category.update({
                where: { id: homeCat.id },
                data: { name: 'Vivienda', icon: 'Home' } // Keep icon if valid
            });
        } else {
            console.log(`Profile ${p.name} clean or no action needed.`);
        }
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
