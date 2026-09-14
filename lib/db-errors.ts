/**
 * Traduce un fallo de base de datos a algo que se pueda leer en pantalla.
 *
 * Existe por lo que costó diagnosticar una caída real: la app mostraba "Algo
 * salió mal" y un identificador, y ese identificador solo se resuelve entrando
 * en los registros de Vercel. Quien administra esto no tenía forma de saber qué
 * había pasado sin abrir un panel y filtrar a mano.
 *
 * ## La regla que no se rompe
 *
 * El mensaje de Prisma puede llevar dentro la cadena de conexión, con usuario y
 * contraseña. Por eso **nunca se devuelve el mensaje original**: se clasifica
 * por código y se devuelve texto escrito aquí. Lo único que se copia del error
 * es el nombre de una tabla o columna, que no es un secreto y es justo el dato
 * que hace falta para arreglarlo.
 *
 * El error completo sí va a los registros, vía `reportError`.
 */

/** Lo que se puede enseñar de un fallo de base de datos. */
export interface DiagnosticoDB {
    /** Clave estable para distinguirlos en pruebas y registros. */
    clase:
        | 'columna-ausente'
        | 'tabla-ausente'
        | 'sin-conexion'
        | 'credenciales'
        | 'base-inexistente'
        | 'sin-configurar'
        | 'saturada'
        | 'desconocido';
    /** Qué ha pasado, en una frase. */
    titulo: string;
    /** Por qué, en términos de esta app. */
    explicacion: string;
    /** Qué hacer. Vacío si no hay un paso claro. */
    accion?: string;
}

/**
 * Los códigos de Prisma que importan aquí.
 * https://www.prisma.io/docs/reference/api-reference/error-reference
 */
function leerCodigo(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;
    const e = error as { code?: unknown; errorCode?: unknown };
    // Los errores de consulta traen `code`; los de arranque, `errorCode`.
    const codigo = e.code ?? e.errorCode;
    return typeof codigo === 'string' ? codigo : null;
}

/**
 * El nombre de la tabla o columna implicada, si Prisma lo dice.
 *
 * Se limpia a conciencia: solo se aceptan caracteres de identificador. Si el
 * valor trajera cualquier otra cosa, se descarta en vez de enseñarla.
 */
function leerObjetoImplicado(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;
    const meta = (error as { meta?: Record<string, unknown> }).meta;
    if (!meta) return null;

    const bruto = meta.column ?? meta.table ?? meta.modelName;
    if (typeof bruto !== 'string') return null;

    return /^[A-Za-z0-9_.]{1,120}$/.test(bruto) ? bruto : null;
}

/** Detecta por texto los fallos que no traen código, sin copiar el mensaje. */
function mencionaVariableAusente(error: unknown): boolean {
    const mensaje = error instanceof Error ? error.message : '';
    return /environment variable not found/i.test(mensaje);
}

/**
 * ¿Este fallo viene de la base de datos?
 *
 * Importa distinguirlo: por el mismo sitio pasan errores de autorización y de
 * lógica, y enseñar "no se pudo conectar a la base de datos" cuando lo que pasó
 * es que alguien tocó datos ajenos sería mentir, además de esconder un fallo
 * real. Lo que no sea de base de datos debe seguir subiendo.
 *
 * Todos los errores de Prisma llevan `clientVersion`, y sus nombres empiezan
 * por `PrismaClient`; los códigos son `P` más cuatro dígitos.
 */
export function esErrorDeBaseDeDatos(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const e = error as { name?: unknown; clientVersion?: unknown };
    if (typeof e.clientVersion === 'string') return true;
    if (typeof e.name === 'string' && e.name.startsWith('PrismaClient')) return true;

    const codigo = leerCodigo(error);
    if (codigo && /^P\d{4}$/.test(codigo)) return true;

    return mencionaVariableAusente(error);
}

export function diagnosticarErrorDB(error: unknown): DiagnosticoDB {
    const codigo = leerCodigo(error);
    const objeto = leerObjetoImplicado(error);

    switch (codigo) {
        case 'P2022':
            return {
                clase: 'columna-ausente',
                titulo: 'La base de datos no está al día',
                explicacion: objeto
                    ? `Al código le falta una columna en la base de datos: ${objeto}. Se desplegó un cambio de esquema sin aplicarlo a la base.`
                    : 'Al código le falta una columna en la base de datos. Se desplegó un cambio de esquema sin aplicarlo a la base.',
                accion: 'Aplica la migración pendiente a la base de datos que usa el despliegue.',
            };

        case 'P2021':
            return {
                clase: 'tabla-ausente',
                titulo: 'La base de datos no está al día',
                explicacion: objeto
                    ? `Falta una tabla en la base de datos: ${objeto}.`
                    : 'Falta una tabla en la base de datos.',
                accion: 'Aplica las migraciones pendientes a la base de datos que usa el despliegue.',
            };

        case 'P1001':
        case 'P1017':
            return {
                clase: 'sin-conexion',
                titulo: 'No se pudo conectar a la base de datos',
                explicacion: 'El servidor de la base de datos no responde. Puede estar suspendido, apagado o inalcanzable desde el despliegue.',
                accion: 'Comprueba que la base de datos esté activa y que el despliegue apunte a ella.',
            };

        case 'P1000':
            return {
                clase: 'credenciales',
                titulo: 'La base de datos rechazó las credenciales',
                explicacion: 'El usuario o la contraseña de la conexión no son válidos. Suele pasar tras rotar la contraseña sin actualizarla en el despliegue.',
                accion: 'Actualiza la cadena de conexión en las variables de entorno del despliegue.',
            };

        case 'P1003':
            return {
                clase: 'base-inexistente',
                titulo: 'La base de datos no existe',
                explicacion: 'La conexión es válida, pero apunta a una base que no está ahí. Suele ser apuntar a una rama o entorno equivocado.',
                accion: 'Revisa a qué base apunta la cadena de conexión del despliegue.',
            };

        case 'P2024':
            return {
                clase: 'saturada',
                titulo: 'La base de datos está saturada',
                explicacion: 'Se agotó el tiempo esperando una conexión libre. Suele ser pasajero.',
                accion: 'Vuelve a intentarlo en un momento.',
            };
    }

    if (mencionaVariableAusente(error)) {
        return {
            clase: 'sin-configurar',
            titulo: 'Falta configurar la base de datos',
            explicacion: 'El despliegue no tiene definida la variable de entorno con la cadena de conexión.',
            accion: 'Define POSTGRES_PRISMA_URL en las variables de entorno del despliegue.',
        };
    }

    return {
        clase: 'desconocido',
        titulo: 'No se pudieron cargar tus datos',
        explicacion: 'La consulta a la base de datos falló por un motivo que la app no sabe interpretar.',
        accion: 'El detalle completo está en los registros del servidor.',
    };
}
