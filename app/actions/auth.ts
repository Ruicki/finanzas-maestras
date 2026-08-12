'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { signSession, verifySession } from '@/lib/auth-utils';
import { logAction } from './audit';

const SESSION_COOKIE = 'auth_session';

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Por favor ingrese correo y contraseña' };
    }

    try {
        const profile = await prisma.profile.findUnique({
            where: { email },
        });

        if (!profile || !profile.password) {
            return { error: 'Credenciales inválidas' };
        }

        const isValid = await bcrypt.compare(password, profile.password);

        if (!isValid) {
            return { error: 'Credenciales inválidas' };
        }

        // Crear sesión segura con JWT
        const token = await signSession({
            userId: profile.id.toString(),
            role: profile.role
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: '/',
        });

        return { success: true };

    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Error interno del servidor' };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect('/login');
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    // Verificar token firmado
    const payload = await verifySession(token);
    if (!payload || !payload.userId) return null;

    return parseInt(payload.userId as string);
}

export async function register(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || !email || !password) {
        return { error: 'Todos los campos son obligatorios' };
    }

    try {
        const existing = await prisma.profile.findUnique({ where: { email } });
        if (existing) return { error: 'Este correo ya está registrado' };

        const hashedPassword = await bcrypt.hash(password, 10);

        const newProfile = await prisma.profile.create({
            data: {
                name,
                email,
                password: hashedPassword,
                accounts: {
                    create: {
                        name: 'Efectivo',
                        balance: 0,
                        type: 'CASH',
                        isDefault: true
                    }
                }
            }
        });

        // Crear sesión segura
        const token = await signSession({
            userId: newProfile.id.toString(),
            role: newProfile.role
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return { success: true };

    } catch (error) {
        console.error("Register Error:", error);
        return { error: 'Error al registrar usuario' };
    }
}

export async function updateProfile(profileId: number, formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const data: any = {};
        if (name) data.name = name;
        if (email) {
            // Verificar unicidad si el correo cambia
            const existing = await prisma.profile.findUnique({ where: { email } });
            if (existing && existing.id !== profileId) return { error: 'Este correo ya está en uso' };
            data.email = email;
        }
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        await prisma.profile.update({
            where: { id: profileId },
            data
        });

        return { success: true };
    } catch (error) {
        console.error("Update Profile Error:", error);
        return { error: 'Error actualizando perfil' };
    }
}

export async function generateAccessCode(profileId: number) {
    try {
        // Código simple de 6 caracteres
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        await prisma.profile.update({
            where: { id: profileId },
            data: { accessCode: code }
        });

        revalidatePath('/budget'); // Refrescar UI para mostrar el código si es necesario o simplemente devolverlo
        return { success: true, code };
    } catch (error) {
        console.error("Generate Access Code Error:", error);
        return { error: 'Error generando código' };
    }
}

export async function claimProfile(formData: FormData) {
    const rawCode = formData.get('code') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!rawCode || !email || !password) {
        return { error: 'Todos los campos son obligatorios' };
    }

    const code = rawCode.trim().toUpperCase();

    try {
        // verificar código
        const profile = await prisma.profile.findUnique({
            where: { accessCode: code }
        });

        if (!profile) {
            return { error: 'Código inválido o expirado' };
        }

        // verificar unicidad del correo (a menos que sea el mismo perfil)
        const existingEmail = await prisma.profile.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== profile.id) {
            return { error: 'Este correo ya está en uso por otro usuario.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.profile.update({
            where: { id: profile.id },
            data: {
                email,
                password: hashedPassword,
                accessCode: null // Consumir el código
            }
        });

        // Inicio de sesión automático seguro
        const token = await signSession({
            userId: profile.id.toString(),
            role: profile.role
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return { success: true };

    } catch (error) {
        console.error("Claim Profile Error:", error);
        return { error: 'Error reclamando perfil' };
    }
}

export async function resetPassword(profileId: number, newPassword: string) {
    if (!newPassword || newPassword.length < 4) {
        return { error: 'La contraseña debe tener al menos 4 caracteres' };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.profile.update({
            where: { id: profileId },
            data: { password: hashedPassword }
        });
        return { success: true };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { error: 'Error al restablecer la contraseña' };
    }
}

const IMPERSONATE_COOKIE = 'impersonate_id';

export async function startImpersonation(targetId: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return { error: 'No autorizado' };

    const payload = await verifySession(token);
    if (!payload || payload.role !== 'ADMIN') {
        return { error: 'Solo los administradores pueden realizar esta acción' };
    }

    // Set temporary cookie
    cookieStore.set(IMPERSONATE_COOKIE, targetId.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    revalidatePath('/');
    await logAction('IMPERSONATE_START', `Impersonación iniciada para ID: ${targetId}`, targetId);
    return { success: true };
}

export async function stopImpersonation() {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE);
    revalidatePath('/');
    return { success: true };
}

export async function getImpersonatedId(): Promise<number | null> {
    const cookieStore = await cookies();
    const val = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    return val ? parseInt(val) : null;
}

// Deprecated or alias to startImpersonation for compatibility
export async function impersonate(targetProfileId: number) {
    return startImpersonation(targetProfileId);
}
