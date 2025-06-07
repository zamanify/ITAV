import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { useEffect, useContext } from 'react';
import { LogOut, User, Mail, Phone, MapPin, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleLogout = async () => {
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
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) {
              router.replace('/landingPage');
            }
          },
        },
      ]
    );
  };

  // Mock user data - in a real app, this would come from the database
  const userData = {
    name: 'Zeke Tastas',
    email: session?.user?.email || 'zeke@example.com',
    phone: '+46 70 123 45 67',
    address: 'Storgatan 123, 123 45 Stockholm',
    memberSince: '28 maj 2025',
    minuteBalance: 0,
  };

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
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.memberSince}>Medlem sedan {userData.memberSince}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>DITT SALDO</Text>
          <Text style={styles.balanceValue}>{userData.minuteBalance} minuter</Text>
          <Text style={styles.balanceDescription}>
            {userData.minuteBalance === 0 
              ? 'Du har ett neutralt saldo' 
              : userData.minuteBalance > 0 
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
              <Text style={styles.infoValue}>{userData.phone}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adress</Text>
              <Text style={styles.infoValue}>{userData.address}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Calendar size={20} color="#666" strokeWidth={1.5} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Medlem sedan</Text>
              <Text style={styles.infoValue}>{userData.memberSince}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable style={styles.editButton}>
            <Text style={styles.editButtonText}>Redigera profil</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#FF4444" strokeWidth={1.5} />
            <Text style={styles.logoutButtonText}>Logga ut</Text>
          </Pressable>
        </View>

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  logoutButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  bottomSpacing: {
    height: 120, // Space for footer
  },
});