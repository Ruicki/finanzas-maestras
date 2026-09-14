/**
 * Crea un perfil recien registrado, para poder recorrer el primer uso una y
 * otra vez sin tener que registrarse a mano cada vez.
 *
 *   npm run seed:nuevo
 *   npm run seed:nuevo -- --email otro@correo.com
 *
 * Reproduce exactamente lo que deja el registro real (app/actions/auth.ts):
 * el perfil, su contraseña hasheada con el mismo coste, y la cuenta "Efectivo"
 * por defecto. A proposito NO crea categorias ni marca onboardingSeenAt: eso es
 * justo lo que debe resolver el primer arranque (ensureProfileIntegrity siembra
 * las categorias, y la bienvenida sale por tener onboardingSeenAt en null).
 *
 * Si el correo ya existe, se borra ese perfil y todo lo suyo antes de recrearlo,
 * para que dos ejecuciones seguidas den el mismo resultado.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mismo coste que el registro real: si aqui fuera distinto, el seed no estaria
// reproduciendo las credenciales que produce la app.
const BCRYPT_ROUNDS = 12;

const DEFAULTS = {
    email: 'nuevo@finanzasmaestras.test',
    password: process.env.SEED_PASSWORD || '',
    name: 'Usuario Nuevo',
};

function leerArgumentos(argv: string[]) {
    const valores = { ...DEFAULTS };
    for (let i = 0; i < argv.length; i += 1) {
        const clave = argv[i];
        const valor = argv[i + 1];
        if (!valor || valor.startsWith('--')) continue;
        if (clave === '--email') valores.email = valor;
        if (clave === '--password') valores.password = valor;
        if (clave === '--name') valores.name = valor;
    }
    return valores;
}

const prisma = new PrismaClient();

async function main() {
    const { email, password, name } = leerArgumentos(process.argv.slice(2));

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Este seed crea un usuario de prueba con contraseña conocida. No se ejecuta con NODE_ENV=production.',
        );
    }

    const existente = await prisma.profile.findUnique({ where: { email } });
    if (existente) {
        console.log(`Ya habia un perfil con ${email} (id ${existente.id}). Se borra para empezar limpio.`);
        await borrarPerfil(existente.id);
    }

    const perfil = await prisma.profile.create({
        data: {
            name,
            email,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS),
            accounts: {
                create: { name: 'Efectivo', balance: 0, type: 'CASH', isDefault: true },
            },
        },
    });

    console.log('');
    console.log('  Perfil nuevo listo para recorrer el primer uso');
    console.log('  ─────────────────────────────────────────────');
    console.log(`  id:         ${perfil.id}`);
    console.log(`  correo:     ${email}`);
    console.log(`  contraseña: ${password}`);
    console.log('');
    console.log('  Entra en /login con esos datos: saldra la ventana de bienvenida');
    console.log('  y las 7 pestañas estaran vacias.');
    console.log('');
}

/**
 * Borra un perfil y todo lo que cuelga de el. Hace falta a mano porque el
 * esquema casi no declara reglas onDelete, asi que Postgres rechazaria el
 * borrado del perfil mientras queden filas apuntandole. El orden importa: de
 * las hojas hacia la raiz.
 */
async function borrarPerfil(profileId: number) {
    await prisma.$transaction(async (tx) => {
        await tx.expense.updateMany({
            where: { profileId },
            data: { accountId: null, categoryId: null, linkedCardId: null },
        });
        await tx.additionalIncome.updateMany({ where: { profileId }, data: { accountId: null } });
        await tx.salary.updateMany({ where: { profileId }, data: { accountId: null } });

        await tx.expense.deleteMany({ where: { profileId } });
        await tx.additionalIncome.deleteMany({ where: { profileId } });
        await tx.salary.deleteMany({ where: { profileId } });
        await tx.transfer.deleteMany({
            where: {
                OR: [
                    { sourceAccount: { profileId } },
                    { destinationAccount: { profileId } },
                ],
            },
        });
        await tx.goal.deleteMany({ where: { profileId } });
        await tx.loan.deleteMany({ where: { profileId } });
        await tx.creditCard.deleteMany({ where: { profileId } });
        await tx.account.deleteMany({ where: { profileId } });
        await tx.category.deleteMany({ where: { profileId } });
        await tx.auditLog.deleteMany({ where: { profileId } });
        await tx.profile.delete({ where: { id: profileId } });
    });
}

main()
    .catch((error) => {
        console.error('El seed fallo:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
