import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Camera, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/lib/phone';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

type ValidationErrors = { [key: string]: string };

type UserData = {
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  profileImageUrl: string;
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
    city: '',
    profileImageUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
        .select('email, phone_number, street_address, zip_code, city, profile_image_url')
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
        city: data.city || '',
        profileImageUrl: data.profile_image_url || ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    if (isUploadingImage) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tillstånd krävs', 'Vi behöver tillgång till dina foton för att du ska kunna välja en profilbild.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Fel', 'Kunde inte öppna bildgalleriet. Försök igen.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!session?.user?.id) return;

    try {
      setIsUploadingImage(true);
      setError(null);

      // Log the image URI we're trying to upload
      console.log('Attempting to upload image. Image URI:', imageUri);

      // Create a unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Convert image URI to blob for upload
      const response = await fetch(imageUri);
      console.log('Fetch response status:', response.status, 'OK:', response.ok);
      if (!response.ok) {
        console.error('Fetch failed with status:', response.status);
        setError(`Failed to fetch image data: ${response.status}`);
        return; // Exit if fetch failed
      }

      const blob = await response.blob();
      console.log('Blob type:', blob.type);
      console.log('Blob size:', blob.size); // This is the most important check
      if (blob.size === 0) {
        setError('Selected image file is empty or could not be read.');
        return; // Exit if blob is empty
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image to Supabase Storage:', uploadError);
        setError('Kunde inte ladda upp bilden till lagring. Försök igen.');
        return;
      }
      console.log('Supabase Storage upload data:', uploadData);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        setError('Kunde inte få bildlänk. Försök igen.');
        return;
      }
      console.log('Public URL data:', urlData);

      // Update the form data with the new image URL
      setFormData(prev => ({
        ...prev,
        profileImageUrl: urlData.publicUrl
      }));

      // Update the database immediately
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: urlData.publicUrl })
        .eq('id', session.user.id);

      if (updateError) {
        console.error('Error updating profile image in database:', updateError);
        setError('Kunde inte spara profilbilden. Försök igen.');
        return;
      }

      // Delete old image if it exists and is different
      if (formData.profileImageUrl && formData.profileImageUrl !== urlData.publicUrl) {
        try {
          const oldPath = formData.profileImageUrl.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from('profile-images')
              .remove([`profile-images/${oldPath}`]);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
          // Don't show error to user for cleanup failures
        }
      }

    } catch (err) {
      console.error('Error uploading profile image:', err);
      setError('Ett fel uppstod vid uppladdning av bild');
    } finally {
      setIsUploadingImage(false);
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
        profile_image_url: formData.profileImageUrl,
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
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <Text style={styles.label}>PROFILBILD</Text>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              {formData.profileImageUrl ? (
                <Image source={{ uri: formData.profileImageUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <User size={40} color="#FF69B4" strokeWidth={1.5} />
                </View>
              )}
            </View>
            <Pressable 
              style={[styles.changeImageButton, isUploadingImage && styles.changeImageButtonDisabled]}
              onPress={handleImagePicker}
              disabled={isUploadingImage}
            >
              <Camera size={20} color={isUploadingImage ? "#999" : "#FF69B4"} />
              <Text style={[styles.changeImageButtonText, isUploadingImage && styles.changeImageButtonTextDisabled]}>
                {isUploadingImage ? 'Laddar upp...' : 'Ändra bild'}
              </Text>
            </Pressable>
          </View>
        </View>

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
  profileImageSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    gap: 16,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  changeImageButtonDisabled: {
    borderColor: '#E5E5E5',
    opacity: 0.6,
  },
  changeImageButtonText: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  changeImageButtonTextDisabled: {
    color: '#999',
  },
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