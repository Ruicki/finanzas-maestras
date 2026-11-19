import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { getToken } from '@/lib/auth-storage';

/**
 * Pantalla de arranque: decide a dónde ir según si ya hay una sesión
 * guardada en SecureStore. No se puede decidir de forma síncrona (leer
 * SecureStore es async), así que mientras se resuelve se muestra un loader.
 */
export default function Index() {
    const [destino, setDestino] = useState<'/login' | '/quick-add' | null>(null);

    useEffect(() => {
        getToken().then((token) => setDestino(token ? '/quick-add' : '/login'));
    }, []);

    if (!destino) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2F6699" />
            </View>
        );
    }

    return <Redirect href={destino} />;
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CFE3DD' },
});
