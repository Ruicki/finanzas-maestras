import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { login, ApiError } from '@/lib/api';
import { saveSession } from '@/lib/auth-storage';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Faltan datos', 'Ingresá tu correo y contraseña.');
            return;
        }
        setLoading(true);
        try {
            const { token, profile } = await login(email.trim(), password);
            await saveSession(token, profile);
            router.replace('/quick-add');
        } catch (error) {
            const message = error instanceof ApiError ? error.message : 'No se pudo conectar. Intentá de nuevo.';
            Alert.alert('No se pudo iniciar sesión', message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={styles.title}>Finanzas Maestras</Text>
            <Text style={styles.subtitle}>Iniciá sesión para agregar ingresos y gastos rápido</Text>

            <TextInput
                style={styles.input}
                placeholder="Correo"
                placeholderTextColor="#8AA"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#8AA"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#F1ECE2" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </Pressable>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#CFE3DD', justifyContent: 'center', padding: 24, gap: 12 },
    title: { fontSize: 28, fontWeight: '700', color: '#2F6699', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#45627A', textAlign: 'center', marginBottom: 16 },
    input: {
        backgroundColor: '#F1ECE2',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#20323F',
    },
    button: {
        backgroundColor: '#2F6699',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: { color: '#F1ECE2', fontSize: 16, fontWeight: '600' },
});
