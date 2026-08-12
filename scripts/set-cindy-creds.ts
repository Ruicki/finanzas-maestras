
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setCindyCreds() {
    try {
        const email = 'cindybeth97@gmail.com';
        const password = '1234'; // Default password
        const hashedPassword = await bcrypt.hash(password, 10);

        const cindy = await prisma.profile.findFirst({
            where: { name: { contains: 'Cindy', mode: 'insensitive' } }
        });

        if (!cindy) {
            console.log("Error: Profile 'Cindy' not found.");
            return;
        }

        // Check if email is already taken
        const existing = await prisma.profile.findUnique({ where: { email } });
        if (existing && existing.id !== cindy.id) {
            console.log(`Error: The email ${email} is already in use by ID ${existing.id} (${existing.name}).`);
            return;
        }

        await prisma.profile.update({
            where: { id: cindy.id },
            data: {
                email: email,
                password: hashedPassword,
                accessCode: null // Remove access code as it's no longer needed
            }
        });

        console.log(`SUCCESS: Updated Cindy (ID: ${cindy.id})`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

setCindyCreds();
