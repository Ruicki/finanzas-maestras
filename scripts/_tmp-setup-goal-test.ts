import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    await prisma.account.updateMany({ where: { profileId: 12, name: 'Efectivo' }, data: { balance: 500 } });
    const cuentaB = await prisma.account.create({
        data: { name: 'Cuenta B Test', type: 'BANK', purpose: 'SPENDING', balance: 0, profileId: 12 },
    });
    console.log('Efectivo funded, Cuenta B created:', cuentaB.id);
    await prisma.$disconnect();
}
run();
