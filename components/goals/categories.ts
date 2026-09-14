import { FlagIcon, CarIcon, HouseIcon, BookOpenIcon, HeartIcon, RocketIcon, ShieldCheckIcon, WalletIcon } from '@animateicons/react/lucide';

/**
 * Las clases de meta que ofrece la app.
 *
 * Vive aparte porque la usan tanto la tarjeta de la meta —para su icono— como
 * el formulario de alta: tenerla dentro de la pestaña obligaba a que las dos
 * cosas estuvieran en el mismo archivo.
 */
export const GOAL_CATEGORIES = [
    { id: 'SAVINGS', label: 'Ahorro General', icon: WalletIcon, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' },
    { id: 'EMERGENCY', label: 'Fondo de Emergencia', icon: ShieldCheckIcon, color: 'text-blue-500 bg-blue-100 dark:bg-blue-500/20' },
    { id: 'CAR', label: 'Carro', icon: CarIcon, color: 'text-orange-500 bg-orange-100 dark:bg-orange-500/20' },
    { id: 'HOUSE', label: 'Casa', icon: HouseIcon, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/20' },
    { id: 'EDUCATION', label: 'Educación', icon: BookOpenIcon, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' },
    { id: 'TRAVEL', label: 'Viaje', icon: RocketIcon, color: 'text-purple-500 bg-purple-100 dark:bg-purple-500/20' },
    { id: 'HEALTH', label: 'Salud', icon: HeartIcon, color: 'text-red-500 bg-red-100 dark:bg-red-500/20' },
    { id: 'OTHER', label: 'Otro', icon: FlagIcon, color: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-500/20' },
];

export function getCategoryInfo(categoryId: string | null | undefined) {
    return GOAL_CATEGORIES.find(c => c.id === categoryId) || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
}

export function getStage(percentage: number): { label: string; color: string } {
    if (percentage >= 100) return { label: '¡Completa!', color: 'text-emerald-500' };
    if (percentage >= 75) return { label: 'Casi lista', color: 'text-emerald-400' };
    if (percentage >= 50) return { label: 'En progreso', color: 'text-blue-500' };
    if (percentage >= 25) return { label: 'Construyendo', color: 'text-amber-500' };
    return { label: 'Empezando', color: 'text-zinc-400' };
}
