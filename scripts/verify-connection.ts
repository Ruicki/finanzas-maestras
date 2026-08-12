
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Intentando conectar a la base de datos...');

    try {
        // Intentar contar los registros (lectura simple)
        const count = await prisma.salary.count();
        console.log(`✅ Conexión EXITOSA. Hay ${count} salarios guardados.`);

        // Intentar crear un registro de prueba
        console.log('🔄 Probando escritura...');
        const testSalary = await prisma.salary.create({
            data: {
                grossVal: 1000,
                netVal: 800,
                taxes: 200,
                bonus: 0,
                socialSec: 0,
                eduIns: 0,
                incomeTax: 0
            }
        });
        console.log(`✅ Escritura EXITOSA. ID creado: ${testSalary.id}`);

        // Limpiar (Borrar el de prueba)
        await prisma.salary.delete({ where: { id: testSalary.id } });
        console.log('✅ Limpieza completada.');

        console.log('🎉 TRES PRUEBAS PASADAS: Conexión, Lectura, Escritura.');
    } catch (e) {
        console.error('❌ ERROR FATAL:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
