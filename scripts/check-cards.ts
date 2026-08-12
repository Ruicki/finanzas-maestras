
import { prisma } from '../lib/prisma';

async function main() {
    console.log('Verificando tarjetas de crédito...');
    const cards = await prisma.creditCard.findMany({
        include: { profile: true }
    });

    console.log(`Total de tarjetas encontradas: ${cards.length}`);
    cards.forEach(c => {
        console.log(`- ID: ${c.id} | Nombre: ${c.name} | Balance: ${c.balance} | Perfil: ${c.profile.name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
