/**
 * Lo que todo perfil necesita tener desde el primer dia.
 *
 * Estaba repartido: `register` creaba la cuenta de Efectivo, las categorias las
 * sembraba `ensureProfileIntegrity` desde el render de la pagina, y los perfiles
 * que crea un administrador no recibian ni una cosa ni la otra hasta que su
 * dueño entraba. Asi que el estado inicial de un perfil dependia de por donde
 * hubiera entrado y de cuantas veces hubiera cargado el dashboard.
 *
 * Ahora se siembra en el mismo `create` del perfil, en las tres vias que existen
 * —registro, alta por administrador y seed—. Al ir anidado, es una sola
 * escritura atomica: no hay ventana en la que exista un perfil a medio montar.
 */

export const CUENTA_EFECTIVO = {
    name: 'Efectivo',
    balance: 0,
    type: 'CASH',
    isDefault: true,
} as const;

export const CATEGORIAS_POR_DEFECTO = [
    { name: 'Vivienda', icon: 'Home', color: 'text-blue-500', type: 'FIXED' },
    { name: 'Comida', icon: 'ShoppingBag', color: 'text-orange-500', type: 'VARIABLE' },
    { name: 'Transporte', icon: 'Car', color: 'text-zinc-500', type: 'FIXED' },
    { name: 'Entretenimiento', icon: 'Coffee', color: 'text-pink-500', type: 'LUXURY' },
    { name: 'Servicios', icon: 'Zap', color: 'text-yellow-500', type: 'FIXED' },
    { name: 'Salud', icon: 'HeartPulse', color: 'text-red-500', type: 'VARIABLE' },
    { name: 'Educación', icon: 'GraduationCap', color: 'text-indigo-500', type: 'FIXED' },
    { name: 'Tecnología', icon: 'Smartphone', color: 'text-cyan-500', type: 'VARIABLE' },
    { name: 'Viajes', icon: 'Plane', color: 'text-emerald-500', type: 'LUXURY' },
] as const;

/** Para anidar dentro de `prisma.profile.create({ data: { ..., ...datosInicialesDelPerfil } })`. */
export const datosInicialesDelPerfil = {
    accounts: { create: { ...CUENTA_EFECTIVO } },
    categories: { create: CATEGORIAS_POR_DEFECTO.map((c) => ({ ...c })) },
};

/**
 * ¿A este perfil le falta algo de lo que deberia haber tenido el primer dia?
 *
 * Existe para los perfiles creados antes de que la siembra fuera parte del alta.
 * Es solo una comprobacion sobre datos ya cargados: no consulta nada.
 */
export function necesitaSiembraInicial(perfil: {
    accounts: unknown[];
    categories: unknown[];
}): boolean {
    return perfil.accounts.length === 0 || perfil.categories.length === 0;
}
