import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Share2, Check, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
};

export default function CreateHoodScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>([]);
  const [connectedVillagers, setConnectedVillagers] = useState<Villager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchConnectedVillagers();
    }
  }, [session?.user?.id]);

  const fetchConnectedVillagers = async () => {
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
          balance: otherUser.minute_balance || 0
        };
      }).filter(Boolean) as Villager[];

      setConnectedVillagers(villagersData);
    } catch (err) {
      console.error('Error fetching connected villagers:', err);
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

  const handleShare = () => {
    // Implement share functionality
  };

  const handleCreateHood = async () => {
    if (!session?.user?.id || !groupName.trim()) return;

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          created_by: session.user.id
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group:', groupError);
        setError('Kunde inte skapa gruppen');
        return;
      }

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: session.user.id
        });

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
      }

      // Add selected villagers as members
      if (selectedVillagers.length > 0) {
        const memberInserts = selectedVillagers.map(villagerId => ({
          group_id: groupData.id,
          user_id: villagerId
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Error adding members:', membersError);
        }
      }

      router.back();
    } catch (err) {
      console.error('Error creating hood:', err);
      setError('Ett fel uppstod vid skapande av hood');
    }
  };

  const toggleVillagerSelection = (villagerId: string) => {
    setSelectedVillagers(prev =>
      prev.includes(villagerId)
        ? prev.filter(id => id !== villagerId)
        : [...prev, villagerId]
    );
  };

  const filteredVillagers = connectedVillagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>SKAPA HOOD</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>DÖP DIN NYA GRUPP</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="T.ex familj, bästisar eller dagispappor"
          placeholderTextColor="#999"
        />

        <Text style={[styles.sectionTitle, styles.marginTop]}>LÄGG TILL FLER VILLAGERS</Text>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowResults(text.length > 0);
          }}
          placeholder="Lägg till vän via namn eller mobil"
          placeholderTextColor="#999"
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {showResults && searchQuery.length > 0 && (
          <View style={styles.resultsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Söker bland dina villagers...</Text>
              </View>
            ) : filteredVillagers.length > 0 ? (
              <View>
                <Text style={styles.resultsSectionTitle}>DINA ANSLUTNA VILLAGERS</Text>
                {filteredVillagers.map((villager) => (
                  <Pressable
                    key={villager.id}
                    style={styles.resultItem}
                    onPress={() => toggleVillagerSelection(villager.id)}
                  >
                    <View style={styles.villagerInfo}>
                      <Text style={styles.resultName}>{villager.name}</Text>
                      <Text style={styles.villagerDetails}>
                        {villager.phoneNumber} | Medlem sedan {villager.memberSince}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkCircle,
                      selectedVillagers.includes(villager.id) && styles.checkCircleSelected
                    ]}>
                      {selectedVillagers.includes(villager.id) && (
                        <Check size={16} color="white" />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : connectedVillagers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Inga villagers att lägga till</Text>
                <Text style={styles.emptyDescription}>
                  Du behöver ansluta till villagers först för att kunna lägga till dem i grupper.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Inga villagers matchar sökningen</Text>
                <Text style={styles.emptyDescription}>
                  Försök med ett annat namn eller telefonnummer.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.shareContainer}>
          <Share2 color="#666" size={20} />
          <Text style={styles.shareText}>Gruppinbjudan</Text>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Dela</Text>
          </Pressable>
        </View>

        {selectedVillagers.map(id => {
          const villager = connectedVillagers.find(v => v.id === id);
          if (!villager) return null;
          
          return (
            <View key={villager.id} style={styles.villagerItem}>
              <View style={styles.villagerItemInfo}>
                <Text style={styles.villagerName}>{villager.name}</Text>
                <Text style={styles.villagerItemDetails}>
                  {villager.phoneNumber} | Medlem sedan {villager.memberSince}
                </Text>
              </View>
              <View style={styles.checkCircle}>
                <Check size={16} color="white" />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Pressable 
        style={[styles.createButton, !groupName && styles.createButtonDisabled]} 
        onPress={handleCreateHood}
        disabled={!groupName}
      >
        <Text style={styles.createButtonText}>Spara hood</Text>
      </Pressable>
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
  },
  marginTop: {
    marginTop: 20,
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
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginTop: 10,
    textAlign: 'center',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  resultsSectionTitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    padding: 10,
    backgroundColor: '#F5F5F5',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  villagerInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  villagerDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 20,
  },
  shareText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  shareButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  shareButtonText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  villagerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  villagerItemInfo: {
    flex: 1,
  },
  villagerName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  villagerItemDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF69B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkCircleSelected: {
    backgroundColor: '#FF69B4',
  },
  createButton: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    margin: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});