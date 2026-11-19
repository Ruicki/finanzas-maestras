import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError, fetchContext, quickExpense, quickIncome, type MobileContext } from '@/lib/api';
import { clearSession, getToken } from '@/lib/auth-storage';

const MENSAJES_SESION_VENCIDA = new Set(['No autenticado', 'Sesión inválida']);

type Tipo = 'gasto' | 'ingreso';

export default function QuickAddScreen() {
    const params = useLocalSearchParams<{ tipo?: string }>();
    const [tipo, setTipo] = useState<Tipo>(params.tipo === 'ingreso' ? 'ingreso' : 'gasto');
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState<number | undefined>(undefined);
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [context, setContext] = useState<MobileContext | null>(null);
    const [loadingContext, setLoadingContext] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Esta pantalla puede abrirse directo desde el widget con la app
        // cerrada (deep link), así que puede no haber sesión guardada —
        // mandar a login antes de intentar pedir nada a la API.
        getToken().then((token) => {
            if (!token) {
                router.replace('/login');
                return;
            }

            fetchContext()
                .then((ctx) => {
                    setContext(ctx);
                    const porDefecto = ctx.accounts.find((a) => a.isDefault) ?? ctx.accounts[0];
                    setAccountId(porDefecto?.id);
                })
                .catch((error) => {
                    if (error instanceof ApiError && MENSAJES_SESION_VENCIDA.has(error.message)) {
                        clearSession().then(() => router.replace('/login'));
                        return;
                    }
                    // La pantalla sigue siendo usable sin selector de cuenta/categoría
                    // (la cuenta/categoría quedan sin asignar en el gasto/ingreso).
                    setContext({ accounts: [], categories: [] });
                })
                .finally(() => setLoadingContext(false));
        });
    }, []);

    const montoNumerico = useMemo(() => {
        const normalizado = amount.replace(',', '.');
        const valor = parseFloat(normalizado);
        return Number.isFinite(valor) ? valor : NaN;
    }, [amount]);

    function cerrarPantalla() {
        // Vuelve al home del celular tal cual se abrió desde el widget — no
        // tiene sentido dejar la app abierta en una pantalla que ya cumplió
        // su propósito. BackHandler.exitApp solo existe en Android.
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        } else {
            router.back();
        }
    }

    async function guardar() {
        if (!montoNumerico || montoNumerico <= 0) {
            Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.');
            return;
        }

        setSaving(true);
        try {
            if (tipo === 'gasto') {
                await quickExpense({ amount: montoNumerico, accountId, categoryId });
            } else {
                await quickIncome({ amount: montoNumerico, accountId });
            }
            Alert.alert(
                tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado',
                `$${montoNumerico.toFixed(2)} guardado.`,
                [{ text: 'OK', onPress: cerrarPantalla }],
            );
        } catch (error) {
            const message = error instanceof ApiError ? error.message : 'No se pudo guardar. Intentá de nuevo.';
            Alert.alert('No se pudo guardar', message);
        } finally {
            setSaving(false);
        }
    }

    async function cerrarSesion() {
        await clearSession();
        router.replace('/login');
    }

    if (loadingContext) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2F6699" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Alta rápida</Text>

            <View style={styles.tipoRow}>
                <Pressable
                    style={[styles.tipoButton, tipo === 'gasto' && styles.tipoButtonActivo]}
                    onPress={() => setTipo('gasto')}
                >
                    <Text style={[styles.tipoButtonText, tipo === 'gasto' && styles.tipoButtonTextActivo]}>Gasto</Text>
                </Pressable>
                <Pressable
                    style={[styles.tipoButton, tipo === 'ingreso' && styles.tipoButtonActivo]}
                    onPress={() => setTipo('ingreso')}
                >
                    <Text style={[styles.tipoButtonText, tipo === 'ingreso' && styles.tipoButtonTextActivo]}>Ingreso</Text>
                </Pressable>
            </View>

            <TextInput
                style={styles.amountInput}
                placeholder="$0.00"
                placeholderTextColor="#8AA"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
            />

            {context && context.accounts.length > 0 && (
                <>
                    <Text style={styles.label}>Cuenta</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {context.accounts.map((a) => (
                            <Pressable
                                key={a.id}
                                style={[styles.chip, accountId === a.id && styles.chipActivo]}
                                onPress={() => setAccountId(a.id)}
                            >
                                <Text style={[styles.chipText, accountId === a.id && styles.chipTextActivo]}>
                                    {a.name} · ${a.balance.toFixed(2)}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </>
            )}

            {tipo === 'gasto' && context && context.categories.length > 0 && (
                <>
                    <Text style={styles.label}>Categoría</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        <Pressable
                            style={[styles.chip, categoryId === undefined && styles.chipActivo]}
                            onPress={() => setCategoryId(undefined)}
                        >
                            <Text style={[styles.chipText, categoryId === undefined && styles.chipTextActivo]}>
                                Sin categoría
                            </Text>
                        </Pressable>
                        {context.categories.map((c) => (
                            <Pressable
                                key={c.id}
                                style={[styles.chip, categoryId === c.id && styles.chipActivo]}
                                onPress={() => setCategoryId(c.id)}
                            >
                                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActivo]}>{c.name}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </>
            )}

            <Pressable style={styles.saveButton} onPress={guardar} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color="#F1ECE2" />
                ) : (
                    <Text style={styles.saveButtonText}>Guardar {tipo === 'gasto' ? 'gasto' : 'ingreso'}</Text>
                )}
            </Pressable>

            <Pressable onPress={cerrarSesion} style={styles.logout}>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#CFE3DD', padding: 24, paddingTop: 48, gap: 10 },
    title: { fontSize: 22, fontWeight: '700', color: '#2F6699', marginBottom: 8 },
    tipoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    tipoButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F1ECE2',
    },
    tipoButtonActivo: { backgroundColor: '#2F6699' },
    tipoButtonText: { fontSize: 15, fontWeight: '600', color: '#45627A' },
    tipoButtonTextActivo: { color: '#F1ECE2' },
    amountInput: {
        backgroundColor: '#F1ECE2',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 18,
        fontSize: 32,
        fontWeight: '700',
        color: '#20323F',
        textAlign: 'center',
        marginBottom: 8,
    },
    label: { fontSize: 13, fontWeight: '600', color: '#45627A', marginTop: 4 },
    chipRow: { marginBottom: 4 },
    chip: {
        backgroundColor: '#F1ECE2',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
    },
    chipActivo: { backgroundColor: '#63A0B5' },
    chipText: { fontSize: 13, color: '#45627A', fontWeight: '500' },
    chipTextActivo: { color: '#F1ECE2' },
    saveButton: {
        backgroundColor: '#2F6699',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: { color: '#F1ECE2', fontSize: 16, fontWeight: '700' },
    logout: { alignItems: 'center', marginTop: 16 },
    logoutText: { color: '#45627A', fontSize: 13, textDecorationLine: 'underline' },
});
