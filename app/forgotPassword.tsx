import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

export default function ForgotPasswordScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [email, setEmail] = useState('');
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
    setIsValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }, [email]);

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleResetPassword = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://updatePassword',
      });

      if (error) {
        setError('Kunde inte skicka l\u00e4nk.');
        return;
      }

      setSuccess(true);
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

      <Text style={styles.title}>Gl\u00f6mt l\u00f6senord?</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-POST</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Din e-postadress"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && (
          <Text style={styles.successText}>
            Kontrollera din e-post f\u00f6r l\u00e4nk f\u00f6r att \u00e5terst\u00e4lla
            l\u00f6senordet.
          </Text>
        )}

        <Pressable
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={!isValid || isLoading}
        >
          <Text style={[styles.buttonText, (!isValid || isLoading) && styles.buttonTextDisabled]}>
            {isLoading ? 'Skickar...' : '\u00c5terst\u00e4ll l\u00f6senord'}
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
