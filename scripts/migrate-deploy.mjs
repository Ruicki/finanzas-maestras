#!/usr/bin/env node
/**
 * Aplica las migraciones pendientes antes de construir.
 *
 * Existe por una caida real: se desplego un cambio de esquema sin aplicarlo a la
 * base, y como Prisma selecciona todos los campos escalares en cada lectura, la
 * aplicacion entera dejo de cargar. El despliegue no tenia forma de notarlo.
 *
 * ## Por que no basta con `prisma migrate deploy`
 *
 * Este repositorio vivio sin migraciones: la base de produccion se fue
 * construyendo con `prisma db push` a mano, asi que tiene tablas pero no tiene
 * la tabla de control `_prisma_migrations`. En ese estado `migrate deploy` se
 * niega con P3005 —"the database schema is not empty"— y no aplica nada.
 *
 * Lo habitual entonces es que una persona ejecute una vez
 * `prisma migrate resolve --applied 0_init`. Eso funciona, pero deja el arreglo
 * dependiendo de que alguien se acuerde, que es exactamente el fallo que se
 * intenta cerrar.
 *
 * Asi que se adopta sola, y los tres casos salen bien:
 *
 *   1. Base vacia            -> deploy la crea entera.
 *   2. Base con historial    -> deploy aplica lo que falte.
 *   3. Base sin historial    -> P3005, se marca la baseline como aplicada y se
 *      (el caso de hoy)         reintenta, que aplica el resto.
 *
 * Cualquier otro fallo sube y tumba el despliegue a proposito: es preferible no
 * desplegar a desplegar codigo que la base no soporta.
 */

import { spawnSync } from 'node:child_process';

/** La baseline. Representa el esquema completo tal y como estaba al adoptarlas. */
const BASELINE = '0_init';

function prisma(...args) {
    return spawnSync('npx', ['prisma', ...args], {
        encoding: 'utf8',
        env: process.env,
    });
}

function registrar(resultado) {
    if (resultado.stdout) process.stdout.write(resultado.stdout);
    if (resultado.stderr) process.stderr.write(resultado.stderr);
}

const primerIntento = prisma('migrate', 'deploy');
registrar(primerIntento);

if (primerIntento.status === 0) {
    process.exit(0);
}

const salida = `${primerIntento.stdout ?? ''}${primerIntento.stderr ?? ''}`;

if (!salida.includes('P3005')) {
    // No es el caso que esto sabe resolver. Que falle el despliegue.
    process.exit(primerIntento.status ?? 1);
}

console.log(
    `\nLa base tiene tablas pero no historial de migraciones.\n` +
    `Se marca "${BASELINE}" como ya aplicada y se reintenta: es la adopcion\n` +
    `automatica descrita en scripts/migrate-deploy.mjs.\n`,
);

const adopcion = prisma('migrate', 'resolve', '--applied', BASELINE);
registrar(adopcion);
if (adopcion.status !== 0) process.exit(adopcion.status ?? 1);

const segundoIntento = prisma('migrate', 'deploy');
registrar(segundoIntento);
process.exit(segundoIntento.status ?? 1);
