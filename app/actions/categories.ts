'use server';

import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOwnership } from "@/lib/auth-utils";
import { CATEGORIAS_POR_DEFECTO } from "@/lib/perfil-nuevo";

export async function initializeDefaultCategories(profileId: number) {
    await requireOwnership(profileId);
    // Verificar si el usuario ya tiene categorías
    const count = await prisma.category.count({ where: { profileId } });
    if (count > 0) return;

    // Crear por lotes usando transacción para compatibilidad
    await prisma.$transaction(
        CATEGORIAS_POR_DEFECTO.map(cat =>
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

export async function createCategory(
    profileId: number, name: string, icon: string, color: string, type: string,
) {
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

export async function updateCategory(
    id: number, name: string, icon: string, color: string, type: string,
) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new Error('Categoría no encontrada');
    await requireOwnership(existing.profileId);

    // `Expense.category` guarda el nombre como texto además de la relación.
    // Renombrar sin arrastrarlo dejaba los gastos ya escritos con el nombre
    // anterior, que es de donde salía que un mismo gasto dijera una cosa por la
    // relación y otra por la columna. Va en una transacción porque a medias es
    // exactamente el estado que se intenta evitar.
    const category = await prisma.$transaction(async (tx) => {
        const actualizada = await tx.category.update({
            where: { id },
            data: {
                name,
                icon,
                color,
                type,
            }
        });

        if (existing.name !== name) {
            await tx.expense.updateMany({
                where: { categoryId: id },
                data: { category: name },
            });
        }

        return actualizada;
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
