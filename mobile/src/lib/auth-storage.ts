import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fm_token';
const PROFILE_KEY = 'fm_profile';

export interface StoredProfile {
    id: number;
    name: string;
    email: string;
}

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveSession(token: string, profile: StoredProfile): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function getProfile(): Promise<StoredProfile | null> {
    const raw = await SecureStore.getItemAsync(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PROFILE_KEY);
}
