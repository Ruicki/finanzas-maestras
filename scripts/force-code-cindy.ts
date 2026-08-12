
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceCode() {
    try {
        const cindy = await prisma.profile.findFirst({
            where: { name: { contains: 'Cindy', mode: 'insensitive' } }
        });

        if (!cindy) {
            console.log("Cindy not found");
            return;
        }

        const code = "CINDY1";
        await prisma.profile.update({
            where: { id: cindy.id },
            data: { accessCode: code }
        });

        console.log(`SUCCESS: Assign code ${code} to Cindy (ID: ${cindy.id})`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

forceCode();
