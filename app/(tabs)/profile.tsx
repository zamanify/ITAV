import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { useEffect, useContext, useState } from 'react';
import { LogOut, User, Mail, Phone, MapPin, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../components/AppFooter';

SplashScreen.preventAutoHideAsync();

type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  street_address: string | null;
  zip_code: string | null;
  city: string | null;
  minute_balance: number;
  created_at: string;
};

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching user data:', fetchError);
        setError('Kunde inte hämta användardata');
        return;
      }

      setUserData(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Ett fel uppstod vid hämtning av användardata');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;

    const performLogout = async () => {
      try {
        setIsLoggingOut(true);
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Logout error:', error);
          if (Platform.OS === 'web') {
            alert('Ett fel uppstod vid utloggning. Försök igen.');
          } else {
            Alert.alert('Fel', 'Ett fel uppstod vid utloggning. Försök igen.');
          }
          return;
        }

        // Clear any local state if needed
        setUserData(null);
        
        // Navigate to landing page
        // Use replace to prevent going back to authenticated screens
        router.replace('/landingPage');
        
      } catch (err) {
        console.error('Unexpected logout error:', err);
        if (Platform.OS === 'web') {
          alert('Ett oväntat fel uppstod. Försök igen.');
        } else {
          Alert.alert('Fel', 'Ett oväntat fel uppstod. Försök igen.');
        }
      } finally {
        setIsLoggingOut(false);
      }
    };

    // Use platform-appropriate confirmation dialog
    if (Platform.OS === 'web') {
      const confirmed = confirm('Är du säker på att du vill logga ut?');
      if (confirmed) {
        await performLogout();
      }
    } else {
      Alert.alert(
        'Logga ut',
        'Är du säker på att du vill logga ut?',
        [
          {
            text: 'Avbryt',
            style: 'cancel',
          },
          {
            text: 'Logga ut',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAddress = (streetAddress: string | null, zipCode: string | null, city: string | null) => {
    const parts = [streetAddress, zipCode, city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Ingen adress angiven';
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Inget telefonnummer angivet';
    
    // Format +46XXXXXXXXX to +46 XX XXX XX XX
    if (phone.startsWith('+46') && phone.length === 13) {
      return `+46 ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
    }
    
    return phone;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DITT KONTO</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Laddar din profil...</Text>
        </View>
        <AppFooter />
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DITT KONTO</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Kunde inte ladda användardata'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchUserData}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
        </View>
        <AppFooter />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DITT KONTO</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <User size={48} color="#FF69B4" strokeWidth={1.5} />
          </View>
          <Text style={styles.userName}>
            {userData.first_name} {userData.last_name}
          </Text>
          <Text style={styles.memberSince}>
            Medlem sedan {formatMemberSince(userData.created_at)}
          </Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>DITT SALDO</Text>
          <Text style={styles.balanceValue}>
            {userData.minute_balance > 0 ? '+' : ''}{userData.minute_balance} minuter
          </Text>
          <Text style={styles.balanceDescription}>
            {userData.minute_balance === 0 
              ? 'Du har ett neutralt saldo' 
              : userData.minute_balance > 0 
                ? 'Du har gjort fler tjänster än du fått'
                : 'Du har fått fler tjänster än du gjort'
            }
          </Text>
        </View>

        {/* Profile Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>KONTAKTINFORMATION</Text>
          
          <View style={styles.infoItem}>
            <Mail size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>E-post</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Phone size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>
                {formatPhoneNumber(userData.phone_number)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adress</Text>
              <Text style={styles.infoValue}>
                {formatAddress(userData.street_address, userData.zip_code, userData.city)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Calendar size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Medlem sedan</Text>
              <Text style={styles.infoValue}>
                {formatMemberSince(userData.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable style={styles.editButton} onPress={() => router.push('/profile-edit')}>
            <Text style={styles.editButtonText}>Redigera profil</Text>
          </Pressable>

          <Pressable 
            style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={20} color={isLoggingOut ? "#999" : "#FF4444"} strokeWidth={1.5} />
            <Text style={[styles.logoutButtonText, isLoggingOut && styles.logoutButtonTextDisabled]}>
              {isLoggingOut ? 'Loggar ut...' : 'Logga ut'}
            </Text>
          </Pressable>
        </View>

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <AppFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  userName: {
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  balanceCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  balanceDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  actionSection: {
    gap: 16,
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 25,
    padding: 16,
    gap: 8,
  },
  logoutButtonDisabled: {
    borderColor: '#E5E5E5',
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  logoutButtonTextDisabled: {
    color: '#999',
  },
  bottomSpacing: {
    height: 120, // Space for footer
  },
});