/**
 * Códigos de un solo uso que emite el administrador.
 *
 * Sirven para dos cosas: estrenar un perfil creado por otra persona y recuperar
 * el acceso cuando alguien olvida su contraseña. En los dos casos, quien
 * presenta el código fija correo y contraseña nuevos y el código se consume.
 *
 * ## Por qué la caducidad va dentro del propio código
 *
 * Un código que no caduca es una llave permanente a una cuenta guardada en
 * texto plano en la base de datos: quien lo vea por encima del hombro en el
 * WhatsApp de hace tres meses sigue pudiendo entrar. Lo natural sería una
 * columna `accessCodeExpiresAt`, pero añadir columnas en este repositorio es
 * hoy un `ALTER TABLE` a mano (ver 5.2 en `.specs/tasks.md`), y no compensa
 * pedir eso para esto.
 *
 * Así que el código **es** `<parte aleatoria>-<caducidad>`, y la caducidad se
 * lee del valor guardado. No se puede falsear: el código se busca por igualdad
 * exacta contra la fila, así que cambiar un solo carácter para estirar la fecha
 * hace que deje de encontrarse. La fecha viaja a la vista, sí, pero no es
 * secreta: es justo lo que el administrador tiene que poder decirle a la
 * persona.
 *
 * Cuando 5.2 se resuelva, esto se sustituye por una columna y `parsearCodigo`
 * es el único sitio que cambia.
 */

/** Sin I, L ni O: el código lo teclea una persona a partir de un mensaje. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ023456789';
const LONGITUD_ALEATORIA = 10;
const SEPARADOR = '-';

/** Dos días: da margen para que la persona lo reciba y lo use sin prisa. */
export const HORAS_DE_VIGENCIA = 48;

const MS_POR_MINUTO = 60_000;

/**
 * Parte aleatoria sin sesgo. `ALFABETO` tiene 32 símbolos, así que cada byte
 * aporta exactamente 5 bits y no hace falta descartar nada: 50 bits en total,
 * que con el límite de intentos por IP sobra para que no se adivine.
 */
function parteAleatoria(): string {
    // Web Crypto y no `node:crypto`: este modulo lo importa tambien la pantalla
    // de canje, que es de cliente, y arrastrar un modulo de Node al navegador
    // rompe el empaquetado.
    const bytes = crypto.getRandomValues(new Uint8Array(LONGITUD_ALEATORIA));
    let salida = '';
    for (const byte of bytes) salida += ALFABETO[byte % ALFABETO.length];
    return salida;
}

/** Crea un código nuevo y dice hasta cuándo vale. */
export function generarCodigo(ahora: Date = new Date()): { codigo: string; expira: Date } {
    const expira = new Date(ahora.getTime() + HORAS_DE_VIGENCIA * 60 * MS_POR_MINUTO);
    const minutos = Math.floor(expira.getTime() / MS_POR_MINUTO);
    return {
        codigo: `${parteAleatoria()}${SEPARADOR}${minutos.toString(36).toUpperCase()}`,
        expira,
    };
}

/**
 * Lee la caducidad de un código guardado.
 *
 * Devuelve `null` si el formato no es el esperado, que es el caso de los
 * códigos emitidos antes de que existiera la caducidad. Esos **se tratan como
 * caducados**: prefiero que un administrador vuelva a emitir uno a dejar
 * abiertas las llaves permanentes que ya se repartieron.
 */
export function caducidadDeCodigo(codigo: string): Date | null {
    const partes = codigo.split(SEPARADOR);
    if (partes.length !== 2) return null;

    const minutos = parseInt(partes[1], 36);
    if (!Number.isFinite(minutos) || minutos <= 0) return null;

    return new Date(minutos * MS_POR_MINUTO);
}

/** ¿Este código sigue valiendo? */
export function codigoVigente(codigo: string, ahora: Date = new Date()): boolean {
    const expira = caducidadDeCodigo(codigo);
    return expira !== null && expira.getTime() > ahora.getTime();
}

/**
 * Normaliza lo que teclea la persona antes de buscarlo.
 *
 * Quita espacios —los gestores de contraseñas y el copiar/pegar del móvil los
 * meten solos— y sube a mayúsculas, que es como se emite.
 */
export function normalizarCodigo(entrada: string): string {
    return entrada.replace(/\s+/g, '').toUpperCase();
}
