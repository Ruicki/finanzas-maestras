'use server';

import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOwnership } from "@/lib/auth-utils";

// Configuración de Categorías Predeterminadas
const DEFAULT_CATEGORIES = [
    { name: 'Vivienda', icon: 'Home', color: 'text-blue-500', type: 'FIXED' },
    { name: 'Comida', icon: 'ShoppingBag', color: 'text-orange-500', type: 'VARIABLE' },
    { name: 'Transporte', icon: 'Car', color: 'text-zinc-500', type: 'FIXED' },
    { name: 'Entretenimiento', icon: 'Coffee', color: 'text-pink-500', type: 'LUXURY' },
    { name: 'Servicios', icon: 'Zap', color: 'text-yellow-500', type: 'FIXED' },
    { name: 'Salud', icon: 'HeartPulse', color: 'text-red-500', type: 'VARIABLE' },
    { name: 'Educación', icon: 'GraduationCap', color: 'text-indigo-500', type: 'FIXED' },
    { name: 'Tecnología', icon: 'Smartphone', color: 'text-cyan-500', type: 'VARIABLE' },
    { name: 'Viajes', icon: 'Plane', color: 'text-emerald-500', type: 'LUXURY' },
];

export async function initializeDefaultCategories(profileId: number) {
    await requireOwnership(profileId);
    // Verificar si el usuario ya tiene categorías
    const count = await prisma.category.count({ where: { profileId } });
    if (count > 0) return;

    // Crear por lotes usando transacción para compatibilidad
    await prisma.$transaction(
        DEFAULT_CATEGORIES.map(cat =>
            prisma.category.create({
                data: {
                    ...cat,
                    profileId
                }
            })
        )
    );

    revalidatePath('/');
}

// Helper para serializar categorías
const serializeCategory = (cat: Category) => ({
    ...cat,
    monthlyLimit: cat.monthlyLimit ? Number(cat.monthlyLimit) : null
});

export async function getCategories(profileId: number) {
    await requireOwnership(profileId);
    let categories = await prisma.category.findMany({
        where: { profileId },
        orderBy: { name: 'asc' }
    });

    // Fallback: Si no existen categorías (posible nueva funcionalidad), inicializar ahora
    if (categories.length === 0) {
        await initializeDefaultCategories(profileId);
        categories = await prisma.category.findMany({
            where: { profileId },
            orderBy: { name: 'asc' }
        });
    }

    return categories.map(serializeCategory);
}

export async function createCategory(profileId: number, name: string, icon: string, color: string, type: string) {
    await requireOwnership(profileId);
    const category = await prisma.category.create({
        data: {
            name,
            icon,
            color,
            type,
            profileId
        }
    });
    revalidatePath('/');
    return serializeCategory(category);
}

export async function updateCategory(id: number, name: string, icon: string, color: string, type: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new Error('Categoría no encontrada');
    await requireOwnership(existing.profileId);

    const category = await prisma.category.update({
        where: { id },
        data: {
            name,
            icon,
            color,
            type
        }
    });
    revalidatePath('/');
    return serializeCategory(category);
}

export async function deleteCategory(id: number) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new Error('Categoría no encontrada');
    await requireOwnership(existing.profileId);

    await prisma.expense.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
    });

    await prisma.category.delete({ where: { id } });
    revalidatePath('/');
}

export async function updateCategoryLimit(id: number, limit: number | null) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new Error('Categoría no encontrada');
    await requireOwnership(existing.profileId);

    await prisma.category.update({
        where: { id },
        data: { monthlyLimit: limit }
    });
    revalidatePath('/');
}
