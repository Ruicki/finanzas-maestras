
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCindy() {
    console.log("--- SEARCHING BY NAME 'Cindy' ---");
    const cindys = await prisma.profile.findMany({
        where: { name: { contains: 'Cindy', mode: 'insensitive' } }
    });
    console.dir(cindys, { depth: null });

    console.log("\n--- SEARCHING BY EMAIL 'cindybeth97@gmail.com' ---");
    const byEmail = await prisma.profile.findUnique({
        where: { email: 'cindybeth97@gmail.com' }
    });
    console.dir(byEmail, { depth: null });
}

checkCindy();
