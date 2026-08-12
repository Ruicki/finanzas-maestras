
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const expenses = await prisma.expense.findMany({
        where: { categoryId: { not: null } },
        include: { categoryRel: true }
    });

    console.log(`Found ${expenses.length} expenses with linked categories.`);

    let updatedCount = 0;
    for (const exp of expenses) {
        if (exp.categoryRel && exp.category !== exp.categoryRel.name) {
            console.log(`Syncing expense ${exp.id}: '${exp.category}' -> '${exp.categoryRel.name}'`);
            await prisma.expense.update({
                where: { id: exp.id },
                data: { category: exp.categoryRel.name }
            });
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} expenses.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
