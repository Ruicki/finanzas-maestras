
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('1234', 10);

        // 1. Create/Restore Admin
        const admin = await prisma.profile.upsert({
            where: { email: 'admin@admin.com' },
            update: {},
            create: {
                name: 'Ricardo (Admin)',
                email: 'admin@admin.com',
                password: hashedPassword,
                role: 'ADMIN',
                accounts: {
                    create: {
                        name: 'Efectivo',
                        balance: 0,
                        type: 'CASH',
                        isDefault: true
                    }
                }
            }
        });
        console.log("Admin account ready:");
        console.log("Email: admin@admin.com");
        console.log("Password: 1234");

        // 2. Ensure Cindy allows claiming (Generate code if not present)
        const cindy = await prisma.profile.findFirst({
            where: { name: { contains: 'Cindy', mode: 'insensitive' } }
        });

        if (cindy) {
            console.log(`\nCindy found (ID: ${cindy.id})`);
            if (!cindy.email && !cindy.accessCode) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                await prisma.profile.update({
                    where: { id: cindy.id },
                    data: { accessCode: code }
                });
                console.log(`Generated Access Code for Cindy: ${code}`);
            } else if (cindy.accessCode) {
                console.log(`Existing Access Code for Cindy: ${cindy.accessCode}`);
            } else {
                console.log("Cindy already has an email linked.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

restoreAdmin();
