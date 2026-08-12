
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteToAdmin() {
    const email = 'Ruicki@admin.com';
    try {
        const user = await prisma.profile.findUnique({
            where: { email }
        });

        if (!user) {
            console.log(`Error: User with email '${email}' not found.`);
            return;
        }

        await prisma.profile.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });

        console.log(`SUCCESS: User '${user.name}' (${email}) is now an ADMIN.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

promoteToAdmin();
