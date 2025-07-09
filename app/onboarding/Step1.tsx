import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/phone';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

type ValidationErrors = {
  [key: string]: string;
};

export default function OnboardingStep1() {
  const [fontsLoaded] = useFonts({
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
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    let processedValue = value;
    
    if (field === 'mobile') {
      processedValue = value.replace(/[^\d\s+]/g, '');
    } else if (field === 'email') {
      // Remove all whitespace characters from email input to prevent validation issues
      processedValue = value.replace(/\s/g, '').trim();
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
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

      // Ensure email has all whitespace removed before sending to Supabase
      const cleanedEmail = email.replace(/\s/g, '').trim();

      // Check if phone number already exists before creating auth user
      const { data: existingUserId, error: phoneError } = await supabase.rpc('get_user_id_by_phone', {
        p_phone_number: normalizedPhone
      });

      if (phoneError) {
        console.error('Error calling get_user_id_by_phone:', phoneError);
        setFieldErrors({
          submit: 'Ett fel uppstod vid kontroll av mobilnummer. Försök igen.'
        });
        return;
      }

      if (existingUserId) {
        setFieldErrors({
          mobile: 'Det här mobilnumret är redan registrerat'
        });
        return;
      }

      // First, try to sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanedEmail,
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
            email: cleanedEmail,
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
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBarContent}>
          <Text style={styles.statusBarTime}>9:30</Text>
          <View style={styles.statusBarIcons}></View>
        </View>
      </View>

      {/* Header with logo and menu */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Hamburger menu */}
        <View style={styles.menuContainer}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </View>
      </View>

      {/* Main content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.mainContent}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['rgba(3,193,222,1)', 'rgba(149,0,194,1)']}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Heading */}
            <View style={styles.headingContainer}>
              <Text style={styles.heading}>
                Först, några{'\n'}
                snabba frågor.
              </Text>
            </View>

            {/* Progress tabs */}
            <View style={styles.progressContainer}>
              <View style={styles.progressSteps}>
                <View style={styles.progressStep}>
                  <Text style={styles.progressStepTextActive}>Person 1/3</Text>
                  <View style={styles.progressBarActive} />
                </View>
                <View style={styles.progressStep}>
                  <Text style={styles.progressStepText}>Vänner 2/3</Text>
                  <View style={styles.progressBar} />
                </View>
                <View style={styles.progressStep}>
                  <Text style={styles.progressStepText}>Grupper 3/3</Text>
                  <View style={styles.progressBar} />
                </View>
              </View>
            </View>

            {/* Form fields */}
            <View style={styles.formContainer}>
              {/* Row 1: First Name and Last Name */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Förnamn</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.firstName}
                      onChangeText={(value) => handleInputChange('firstName', value)}
                      placeholder="Ditt förnamn"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </View>
                  {renderError('firstName')}
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Efternamn</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.lastName}
                      onChangeText={(value) => handleInputChange('lastName', value)}
                      placeholder="Ditt efternamn"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </View>
                  {renderError('lastName')}
                </View>
              </View>

              {/* Row 2: Street Address and Postal Code */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Gatuadress</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.streetAddress}
                      onChangeText={(value) => handleInputChange('streetAddress', value)}
                      placeholder="Din gatuadress"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </View>
                  {renderError('streetAddress')}
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Postnummer</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.postalCode}
                      onChangeText={(value) => handleInputChange('postalCode', value)}
                      placeholder="12345"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      keyboardType="numeric"
                    />
                  </View>
                  {renderError('postalCode')}
                </View>
              </View>

              {/* Row 3: City and Email */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Stad</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.city}
                      onChangeText={(value) => handleInputChange('city', value)}
                      placeholder="Din stad"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </View>
                  {renderError('city')}
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Epost</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      placeholder="Din e-postadress"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {renderError('email')}
                </View>
              </View>

              {/* Row 4: Mobile and Password */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Mobil</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.mobile}
                      onChangeText={(value) => handleInputChange('mobile', value)}
                      placeholder="070 123 45 67"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      keyboardType="phone-pad"
                    />
                  </View>
                  {renderError('mobile')}
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Lösenord</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      style={styles.fieldInput}
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      placeholder="Minst 6 tecken"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                  {renderError('password')}
                </View>
              </View>

              {/* GDPR Checkbox */}
              <View style={styles.checkboxContainer}>
                <Pressable 
                  style={styles.checkbox}
                  onPress={() => {
                    setIsChecked(!isChecked);
                    setFieldErrors(prev => ({ ...prev, terms: '' }));
                  }}
                >
                  {isChecked && (
                    <Check size={24} color="white" />
                  )}
                </Pressable>
                <Text style={styles.checkboxLabel}>
                  Jag godkänner{' '}
                  <Link href="/gdpr" style={styles.link}>GDPR</Link>
                  {' '}och{' '}
                  <Link href="/privacy" style={styles.link}>integritetspolicy</Link>
                </Text>
              </View>
              {renderError('terms')}

              {fieldErrors.submit && (
                <Text style={styles.submitError}>{fieldErrors.submit}</Text>
              )}

              {/* Submit button */}
              <Pressable 
                style={styles.submitButton}
                onPress={handleNextStep}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Skapar konto...' : 'Fyll i för att gå vidare'}
                </Text>
                <ArrowRight size={26} color="white" />
              </Pressable>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  statusBar: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  statusBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 20,
  },
  statusBarTime: {
    fontFamily: 'Unbounded-Regular',
    fontSize: 14,
    color: '#333',
  },
  statusBarIcons: {
    flexDirection: 'row',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 55,
  },
  menuContainer: {
    flexDirection: 'column',
    gap: 5,
  },
  menuLine: {
    width: 22,
    height: 3,
    backgroundColor: '#001f27',
    borderRadius: 100,
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headingContainer: {
    marginBottom: 28,
  },
  heading: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 38,
    color: 'white',
    lineHeight: 40,
  },
  progressContainer: {
    marginBottom: 28,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  progressStep: {
    flex: 1,
  },
  progressStepText: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 14,
    color: 'white',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressStepTextActive: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 14,
    color: '#02f1e7',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'white',
  },
  progressBarActive: {
    height: 6,
    backgroundColor: '#02f1e7',
  },
  formContainer: {
    flex: 1,
    gap: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 20,
    color: 'white',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputSeparator: {
    width: 2,
    height: 47,
    backgroundColor: 'white',
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontFamily: 'Unbounded-Regular',
    fontSize: 30,
    color: 'rgba(255, 255, 255, 0.5)',
    height: 47,
  },
  fieldError: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  checkbox: {
    width: 33,
    height: 33,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontFamily: 'Unbounded-Regular',
    fontSize: 15,
    color: 'white',
    flex: 1,
    lineHeight: 25,
  },
  link: {
    textDecorationLine: 'underline',
    color: 'white',
  },
  submitError: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 20,
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
});