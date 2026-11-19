import Constants from 'expo-constants';
import { getToken } from './auth-storage';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://finanzas-maestras.vercel.app';

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new ApiError(data?.error || 'Algo salió mal. Intentá de nuevo.');
    }

    return data as T;
}

export interface LoginResponse {
    token: string;
    profile: { id: number; name: string; email: string };
}

export function login(email: string, password: string): Promise<LoginResponse> {
    return request('/api/mobile/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export interface MobileContext {
    accounts: { id: number; name: string; balance: number; symbol: string | null; isDefault: boolean }[];
    categories: { id: number; name: string; icon: string; color: string }[];
}

export function fetchContext(): Promise<MobileContext> {
    return request('/api/mobile/context');
}

export function quickExpense(input: { amount: number; name?: string; accountId?: number; categoryId?: number }) {
    return request('/api/mobile/quick-expense', { method: 'POST', body: JSON.stringify(input) });
}

export function quickIncome(input: { amount: number; name?: string; accountId?: number }) {
    return request('/api/mobile/quick-income', { method: 'POST', body: JSON.stringify(input) });
}
