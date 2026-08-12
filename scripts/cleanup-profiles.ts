
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    try {
        const profiles = await prisma.profile.findMany();
        console.log(`Found ${profiles.length} profiles.`);

        const cindyProfile = profiles.find(p => p.name.toLowerCase().includes('cindy'));

        if (!cindyProfile) {
            console.log("Advertencia: No se encontró un perfil llamado 'Cindy'. Abortando para evitar perdida de datos.");
            return;
        }

        console.log(`Preserving Profile: ${cindyProfile.name} (ID: ${cindyProfile.id})`);

        const profilesToDelete = profiles.filter(p => p.id !== cindyProfile.id);

        if (profilesToDelete.length === 0) {
            console.log("No hay otros perfiles para eliminar.");
            return;
        }

        console.log(`Deleting ${profilesToDelete.length} profiles...`);

        for (const p of profilesToDelete) {
            console.log(`Deleting profile: ${p.name} (ID: ${p.id})...`);

            // Replicating deleteProfile logic from budget.ts
            await prisma.$transaction([
                prisma.expense.deleteMany({ where: { profileId: p.id } }),
                prisma.goal.deleteMany({ where: { profileId: p.id } }),
                prisma.salary.deleteMany({ where: { profileId: p.id } }),
                prisma.additionalIncome.deleteMany({ where: { profileId: p.id } }),
                prisma.creditCard.deleteMany({ where: { profileId: p.id } }),
                prisma.loan.deleteMany({ where: { profileId: p.id } }),
                prisma.account.deleteMany({ where: { profileId: p.id } }),
                prisma.category.deleteMany({ where: { profileId: p.id } }),
                prisma.profile.delete({ where: { id: p.id } })
            ]);
            console.log(`Deleted ${p.name}.`);
        }

        console.log("Cleanup complete.");

    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
