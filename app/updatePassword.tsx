import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

export default function UpdatePasswordScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    setIsValid(password.length >= 6 && password === confirm);
  }, [password, confirm]);

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleUpdatePassword = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('Kunde inte uppdatera l\u00f6senordet.');
        return;
      }

      setSuccess(true);
      router.replace('/login');
    } catch (err) {
      setError('N\u00e5got gick fel. F\u00f6rs\u00f6k igen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Image source={require('../assets/images/Logo_ITAV.png')} style={styles.logo} />
      </View>

      <Text style={styles.title}>Ny l\u00f6senord</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>L\u00d6SENORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minst 6 tecken"
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>BEKR\u00c4FTA L\u00d6SENORD</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Upprepa l\u00f6senord"
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>L\u00f6senordet uppdaterat.</Text>}

        <Pressable
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={!isValid || isLoading}
        >
          <Text style={[styles.buttonText, (!isValid || isLoading) && styles.buttonTextDisabled]}>
            {isLoading ? 'Sparar...' : 'Spara l\u00f6senord'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 15,
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Unbounded-Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#008000',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});
