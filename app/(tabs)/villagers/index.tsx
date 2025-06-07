import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext } from 'react';
import { ArrowLeft, UserPlus, MessageCircle, UserX } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  status: 'connected' | 'pending' | 'request_received' | 'blocked';
};

export default function VillagersScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchVillagers();
    }
  }, [session?.user?.id]);

  const fetchVillagers = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch villager connections with user details
      const { data: connections, error: connectionsError } = await supabase
        .from('villager_connections')
        .select(`
          id,
          status,
          created_at,
          sender:sender_id(id, first_name, last_name, phone_number, minute_balance, created_at),
          receiver:receiver_id(id, first_name, last_name, phone_number, minute_balance, created_at)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (connectionsError) {
        console.error('Error fetching villager connections:', connectionsError);
        setError('Kunde inte hämta dina villagers');
        return;
      }

      // Transform the data to get the other user in each connection
      const villagersData: Villager[] = (connections || []).map(connection => {
        const otherUser = connection.sender?.id === session.user.id 
          ? connection.receiver 
          : connection.sender;

        if (!otherUser) return null;

        return {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          phoneNumber: otherUser.phone_number || '',
          memberSince: new Date(otherUser.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          balance: otherUser.minute_balance || 0,
          status: 'connected' as const
        };
      }).filter(Boolean) as Villager[];

      setVillagers(villagersData);
    } catch (err) {
      console.error('Error fetching villagers:', err);
      setError('Ett fel uppstod vid hämtning av villagers');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const filteredVillagers = villagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  const renderVillagerActions = (villager: Villager) => (
    <View style={styles.actionButtons}>
      <Pressable style={styles.actionButton}>
        <UserPlus size={24} color="#666" />
        <Text style={styles.actionButtonText}>LÄGG TILL{'\n'}I GRUPP</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <MessageCircle size={24} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}MEDDELANDE</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <UserX size={24} color="#666" />
        <Text style={styles.actionButtonText}>BLOCKERA{'\n'}OCH RADERA</Text>
      </Pressable>
    </View>
  );

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR VILLAGERS...';
    if (error) return 'FEL VID LADDNING';
    if (villagers.length === 0) return 'INGA VILLAGERS ÄNNU';
    if (villagers.length === 1) return 'DU HAR 1 VILLAGER';
    return `DU HAR ${villagers.length} VILLAGERS`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      {!isLoading && !error && villagers.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Sök bland dina villagers"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Laddar dina villagers...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchVillagers}>
              <Text style={styles.retryButtonText}>Försök igen</Text>
            </Pressable>
          </View>
        ) : villagers.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>Inga villagers än</Text>
            <Text style={styles.emptyDescription}>
              Du har inga anslutna villagers ännu. Börja med att bjuda in vänner eller skapa kontakter!
            </Text>
            <Pressable 
              style={styles.inviteButton} 
              onPress={() => router.push('/invite')}
            >
              <Text style={styles.inviteButtonText}>Bjud in villagers</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filteredVillagers.map((villager) => (
              <View key={villager.id} style={styles.villagerCard}>
                <View style={styles.villagerInfo}>
                  <Text style={styles.villagerName}>{villager.name}</Text>
                  <Text style={styles.villagerDetails}>
                    {villager.phoneNumber} | Medlem sedan {villager.memberSince}
                  </Text>
                  <Text style={styles.villagerBalance}>
                    Saldo {villager.balance > 0 ? '+' : ''}{villager.balance} min
                  </Text>
                </View>
                {renderVillagerActions(villager)}
              </View>
            ))}
            
            {filteredVillagers.length === 0 && searchQuery && (
              <View style={styles.centerContainer}>
                <Text style={styles.noResultsText}>
                  Inga villagers matchar "{searchQuery}"
                </Text>
              </View>
            )}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 120, // Space for footer
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
  emptyTitle: {
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inviteButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  villagerCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  villagerInfo: {
    marginBottom: 20,
  },
  villagerName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  villagerDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  villagerBalance: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Unbounded-Regular',
  },
});