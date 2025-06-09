import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Check } from 'lucide-react-native';
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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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
          onChangeText={setSearchQuery}
          placeholder="Sök bland dina villagers"
          placeholderTextColor="#999"
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Villagers list - styled like invite view */}
        <View style={styles.villagersContainer}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Laddar dina villagers...</Text>
            </View>
          ) : connectedVillagers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga villagers att lägga till</Text>
              <Text style={styles.permissionText}>
                Du behöver ansluta till villagers först för att kunna lägga till dem i grupper.
              </Text>
            </View>
          ) : filteredVillagers.length === 0 && searchQuery ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga villagers matchar "{searchQuery}"</Text>
            </View>
          ) : (
            filteredVillagers.map((villager) => (
              <View key={villager.id} style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{villager.name}</Text>
                  <Text style={styles.contactPhone}>{villager.phoneNumber}</Text>
                  <Text style={styles.existingUserBadge}>Ansluten villager</Text>
                </View>
                <Pressable 
                  style={[
                    styles.selectButton,
                    selectedVillagers.includes(villager.id) && styles.selectButtonSelected
                  ]}
                  onPress={() => toggleVillagerSelection(villager.id)}
                >
                  {selectedVillagers.includes(villager.id) ? (
                    <>
                      <Check size={16} color="white" />
                      <Text style={styles.selectButtonTextSelected}>Vald</Text>
                    </>
                  ) : (
                    <Text style={styles.selectButtonText}>Välj</Text>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.spacer} />
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
  scrollContent: {
    paddingBottom: 120, // Space for footer
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
    marginBottom: 20,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginTop: 10,
    textAlign: 'center',
  },
  villagersContainer: {
    flex: 1,
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Contact item styles matching invite view
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 2,
  },
  existingUserBadge: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  selectButtonSelected: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  selectButtonText: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  selectButtonTextSelected: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  spacer: {
    height: 20,
  },
  createButton: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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