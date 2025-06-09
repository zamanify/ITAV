import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext } from 'react';
import { ArrowLeft, Users, MessageCircle, Settings } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';

SplashScreen.preventAutoHideAsync();

type Group = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  isCreator: boolean;
};

export default function GroupsScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchGroups();
    }
  }, [session?.user?.id]);

  const fetchGroups = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch groups where user is a member
      const { data: groupMemberships, error: membershipsError } = await supabase
        .from('group_members')
        .select(`
          group:group_id(
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', session.user.id);

      if (membershipsError) {
        console.error('Error fetching group memberships:', membershipsError);
        setError('Kunde inte hämta dina hoods');
        return;
      }

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupMemberships || []).map(async (membership) => {
          const group = membership.group;
          if (!group) return null;

          // Count members in this group
          const { count: memberCount, error: countError } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          if (countError) {
            console.error('Error counting group members:', countError);
          }

          return {
            id: group.id,
            name: group.name,
            memberCount: memberCount || 0,
            createdAt: new Date(group.created_at).toLocaleDateString('sv-SE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            isCreator: group.created_by === session.user.id
          };
        })
      );

      const validGroups = groupsWithCounts.filter(Boolean) as Group[];
      setGroups(validGroups);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Ett fel uppstod vid hämtning av hoods');
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

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupActions = (group: Group) => (
    <View style={styles.actionButtons}>
      <Pressable style={styles.actionButton}>
        <Users size={24} color="#666" />
        <Text style={styles.actionButtonText}>VISA{'\n'}MEDLEMMAR</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <MessageCircle size={24} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}FÖRFRÅGAN</Text>
      </Pressable>
      {group.isCreator && (
        <Pressable style={styles.actionButton}>
          <Settings size={24} color="#666" />
          <Text style={styles.actionButtonText}>HANTERA{'\n'}GRUPP</Text>
        </Pressable>
      )}
    </View>
  );

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR HOODS...';
    if (error) return 'FEL VID LADDNING';
    if (groups.length === 0) return 'INGA HOODS ÄNNU';
    if (groups.length === 1) return 'DU HAR 1 HOOD';
    return `DINA ${groups.length} HOODS`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      {!isLoading && !error && groups.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Sök bland dina hoods"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Laddar dina hoods...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchGroups}>
              <Text style={styles.retryButtonText}>Försök igen</Text>
            </Pressable>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>Inga hoods än</Text>
            <Text style={styles.emptyDescription}>
              Du är inte medlem i några hoods ännu. Skapa din första hood eller vänta på en inbjudan!
            </Text>
            <Pressable 
              style={styles.createButton} 
              onPress={() => router.push('/create-hood')}
            >
              <Text style={styles.createButtonText}>Skapa din första hood</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filteredGroups.map((group) => (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupDetails}>
                    {group.memberCount} medlemmar | Skapad {group.createdAt}
                  </Text>
                </View>
                {renderGroupActions(group)}
              </View>
            ))}
            
            {filteredGroups.length === 0 && searchQuery && (
              <View style={styles.centerContainer}>
                <Text style={styles.noResultsText}>
                  Inga hoods matchar "{searchQuery}"
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
  createButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createButtonText: {
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
  groupCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  groupInfo: {
    marginBottom: 20,
  },
  groupName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
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