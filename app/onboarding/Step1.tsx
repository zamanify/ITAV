import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/phone';

SplashScreen.preventAutoHideAsync();

type ValidationErrors = {
  [key: string]: string;
};

export default function OnboardingStep1() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    streetAddress: '',
    postalCode: '',
    city: '',
    mobile: '',
  });
  
  const [isChecked, setIsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (field === 'mobile') {
      const cleaned = value.replace(/[^\d\s+]/g, '');
      setFormData(prev => ({
        ...prev,
        [field]: cleaned
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setFieldErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return /^\+46\d{9,10}$/.test(normalized);
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};
    const { firstName, lastName, email, password, streetAddress, postalCode, city, mobile } = formData;

    if (!firstName) {
      errors.firstName = 'Fyll i förnamn';
    }

    if (!lastName) {
      errors.lastName = 'Fyll i efternamn';
    }

    if (!email) {
      errors.email = 'Ange en e-postadress';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ange en korrekt e-postadress';
    }

    if (!password) {
      errors.password = 'Välj ett lösenord';
    } else if (password.length < 6) {
      errors.password = 'Minst 6 tecken';
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

    if (!mobile) {
      errors.mobile = 'Ange ett mobilnummer';
    } else if (!validatePhoneNumber(mobile)) {
      errors.mobile = 'Ange ett korrekt mobilnummer';
    }

    if (!isChecked) {
      errors.terms = 'Du måste godkänna villkoren';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = async () => {
    if (isSubmitting) return;

    const isValid = validateForm();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.mobile);
      const { firstName, lastName, email, password, streetAddress, postalCode, city } = formData;

      // First, try to sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setFieldErrors({
            email: 'Den här e-postadressen är redan registrerad'
          });
        } else {
          setFieldErrors({
            submit: 'Ett fel uppstod vid registrering. Försök igen.'
          });
        }
        return;
      }

      if (data.user) {
        // Try to insert user data, but handle the case where it might already exist
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email,
            phone_number: normalizedPhone,
            street_address: streetAddress,
            zip_code: postalCode,
            city: city
          }, {
            onConflict: 'id'
          });

        if (insertError) {
          console.error('Error inserting user data:', insertError);
          setFieldErrors({
            submit: 'Ett fel uppstod vid sparande av användardata. Försök igen.'
          });
          return;
        }

        router.push('/onboarding/step2');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setFieldErrors({
        submit: 'Ett oväntat fel uppstod. Försök igen.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: string) => {
    if (fieldErrors[field]) {
      return <Text style={styles.fieldError}>{fieldErrors[field]}</Text>;
    }
    return null;
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>Först, några{'\n'}snabba frågor.</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 1:{'\n'}PERSON</Text>
          <View style={[styles.progressBar, styles.activeStep]} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 2:{'\n'}VÄNNER</Text>
          <View style={styles.progressBar} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 3:{'\n'}GRUPPER</Text>
          <View style={styles.progressBar} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>FÖRNAMN*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.firstName && styles.inputError]}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholder="Ditt förnamn"
                placeholderTextColor="#999"
              />
              {renderError('firstName')}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EFTERNAMN*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.lastName && styles.inputError]}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholder="Ditt efternamn"
                placeholderTextColor="#999"
              />
              {renderError('lastName')}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-POST*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.email && styles.inputError]}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Din e-postadress"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              {renderError('email')}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>LÖSENORD*</Text>
              <View style={[styles.passwordContainer, fieldErrors.password && styles.inputError]}>
                <TextInput 
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Minst 6 tecken"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                <Pressable 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff color="#666\" size={16} />
                  ) : (
                    <Eye color="#666" size={16} />
                  )}
                </Pressable>
              </View>
              {renderError('password')}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>GATUADRESS*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.streetAddress && styles.inputError]}
                value={formData.streetAddress}
                onChangeText={(value) => handleInputChange('streetAddress', value)}
                placeholder="Din gatuadress"
                placeholderTextColor="#999"
              />
              {renderError('streetAddress')}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>POSTNUMMER*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.postalCode && styles.inputError]}
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(value) => handleInputChange('postalCode', value)}
                placeholder="12345"
                placeholderTextColor="#999"
              />
              {renderError('postalCode')}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>STAD*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.city && styles.inputError]}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
                placeholder="Din stad"
                placeholderTextColor="#999"
              />
              {renderError('city')}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>MOBIL*</Text>
              <TextInput 
                style={[styles.input, fieldErrors.mobile && styles.inputError]}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(value) => handleInputChange('mobile', value)}
                placeholder="070 123 45 67"
                placeholderTextColor="#999"
              />
              {renderError('mobile')}
            </View>
          </View>

          <Pressable 
            style={styles.checkboxContainer} 
            onPress={() => {
              setIsChecked(!isChecked);
              setFieldErrors(prev => ({ ...prev, terms: '' }));
            }}
          >
            <View style={[
              styles.checkbox, 
              isChecked && styles.checkedBox,
              fieldErrors.terms && styles.checkboxError
            ]} />
            <Text style={styles.checkboxLabel}>
              JAG GODKÄNNER{' '}
              <Link href="/gdpr" style={styles.link}>GDPR</Link>
              {' '}OCH{' '}
              <Link href="/privacy" style={styles.link}>PRIVACY POLICY</Link>
            </Text>
          </Pressable>
          {renderError('terms')}

          {fieldErrors.submit && (
            <Text style={styles.submitError}>{fieldErrors.submit}</Text>
          )}
        </View>
      </ScrollView>

      <Pressable 
        style={styles.button}
        onPress={handleNextStep}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Skapar konto...' : 'Till steg 2'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 60,
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
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  progressStep: {
    flex: 1,
    marginHorizontal: 5,
  },
  stepText: {
    fontSize: 10,
    color: '#FF69B4',
    textAlign: 'center',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
  },
  activeStep: {
    backgroundColor: '#FF69B4',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  form: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
  },
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
  inputError: {
    borderColor: '#FF0000',
  },
  fieldError: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    height: 44,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 0,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#FF69B4',
    marginRight: 10,
    borderRadius: 4,
  },
  checkedBox: {
    backgroundColor: '#FF69B4',
  },
  checkboxError: {
    borderColor: '#FF0000',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    fontFamily: 'Unbounded-Regular',
  },
  link: {
    color: '#FF69B4',
    textDecorationLine: 'underline',
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});