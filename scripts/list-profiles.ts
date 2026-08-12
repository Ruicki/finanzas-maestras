
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        const profiles = await prisma.profile.findMany();
        console.log("--- PROFILES FOUND ---");
        profiles.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name} | Email: ${p.email} | Created: ${p.createdAt}`);
        });
        console.log("----------------------");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
