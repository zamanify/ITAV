import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/lib/phone';


type ValidationErrors = { [key: string]: string };

type UserData = {
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
};

export default function EditProfileScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [formData, setFormData] = useState<UserData>({
    email: '',
    phone: '',
    streetAddress: '',
    postalCode: '',
    city: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session?.user?.id]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, phone_number, street_address, zip_code, city')
        .eq('id', session?.user?.id)
        .single();

      if (error) {
        setError('Kunde inte hämta användardata');
        return;
      }

      setFormData({
        email: data.email || '',
        phone: data.phone_number || '',
        streetAddress: data.street_address || '',
        postalCode: data.zip_code || '',
        city: data.city || ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    // Remove all whitespace characters from email input to prevent validation issues
    const processedValue = field === 'email' ? value.replace(/\s/g, '').trim() : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validatePhoneNumber = (phone: string) => {
    const normalized = normalizePhoneNumber(phone);
    return /^\+46\d{9,10}$/.test(normalized);
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};
    const { email, phone, streetAddress, postalCode, city } = formData;

    if (!email) {
      errors.email = 'Ange en e-postadress';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ange en korrekt e-postadress';
    }

    if (!phone) {
      errors.phone = 'Ange ett mobilnummer';
    } else if (!validatePhoneNumber(phone)) {
      errors.phone = 'Ange ett korrekt mobilnummer';
    }

    if (!streetAddress) {
      errors.streetAddress = 'Ange din gatuadress';
    }

    if (!postalCode) {
      errors.postalCode = 'Ange ett korrekt postnummer';
    }

    if (!city) {
      errors.city = 'Ange stad';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!session?.user?.id || isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    const normalizedPhone = normalizePhoneNumber(formData.phone);
    // Ensure email has all whitespace removed before sending to Supabase
    const cleanedEmail = formData.email.replace(/\s/g, '').trim();

    const { error: userError } = await supabase
      .from('users')
      .update({
        email: cleanedEmail,
        phone_number: normalizedPhone,
        street_address: formData.streetAddress,
        zip_code: formData.postalCode,
        city: formData.city,
      })
      .eq('id', session.user.id);

    if (userError) {
      console.error('Error updating user data:', userError);
      setError('Kunde inte spara användardata');
      setIsSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ email: cleanedEmail });

    if (authError) {
      console.error('Error updating auth user:', authError);
      setError('Kunde inte uppdatera e-post');
      setIsSubmitting(false);
      return;
    }

    router.back();
  };

  const renderError = (field: string) => {
    if (fieldErrors[field]) {
      return <Text style={styles.fieldError}>{fieldErrors[field]}</Text>;
    }
    return null;
  };

  const handleBack = () => {
    router.back();
  };

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>REDIGERA PROFIL</Text>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-POST</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(v) => handleInputChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {renderError('email')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>TELEFON</Text>
          <TextInput
            style={[styles.input, fieldErrors.phone && styles.inputError]}
            value={formData.phone}
            onChangeText={(v) => handleInputChange('phone', v)}
            keyboardType="phone-pad"
          />
          {renderError('phone')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GATUADRESS</Text>
          <TextInput
            style={[styles.input, fieldErrors.streetAddress && styles.inputError]}
            value={formData.streetAddress}
            onChangeText={(v) => handleInputChange('streetAddress', v)}
          />
          {renderError('streetAddress')}
        </View>

        <View style={styles.row}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>POSTNUMMER</Text>
            <TextInput
              style={[styles.input, fieldErrors.postalCode && styles.inputError]}
              value={formData.postalCode}
              onChangeText={(v) => handleInputChange('postalCode', v)}
              keyboardType="numeric"
            />
            {renderError('postalCode')}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>STAD</Text>
            <TextInput
              style={[styles.input, fieldErrors.city && styles.inputError]}
              value={formData.city}
              onChangeText={(v) => handleInputChange('city', v)}
            />
            {renderError('city')}
          </View>
        </View>

        {error && <Text style={styles.submitError}>{error}</Text>}

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Sparar...' : 'Spara'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  backButton: { marginRight: 15 },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  form: { flex: 1, paddingHorizontal: 20 },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputContainer: { flex: 1 },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Unbounded-Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    padding: 10,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
    height: 44,
  },
  inputError: { borderColor: '#FF0000' },
  fieldError: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    marginTop: 4,
  },
  submitError: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { backgroundColor: '#E5E5E5' },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});