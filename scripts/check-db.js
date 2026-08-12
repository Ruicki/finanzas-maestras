const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const profiles = await prisma.profile.findMany({
    include: {
      salaries: true,
      incomes: true,
      accounts: true,
    }
  });
  
  profiles.forEach(p => {
    console.log('Profile:', p.name, 'ID:', p.id);
    console.log('  Salaries:', p.salaries.length, p.salaries.map(s => ({ id: s.id, grossVal: s.grossVal, netVal: s.netVal, createdAt: s.createdAt })));
    console.log('  Incomes:', p.incomes.length, p.incomes.map(i => ({ id: i.id, amount: i.amount, type: i.type, createdAt: i.createdAt })));
    console.log('  Accounts:', p.accounts.length);
  });
  
  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });