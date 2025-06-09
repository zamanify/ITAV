import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

type Group = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  isCreator: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  villagerId: string;
  villagerName: string;
};

export default function GroupSelectionModal({ visible, onClose, villagerId, villagerName }: Props) {
  const { session } = useContext(AuthContext);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && session?.user?.id) {
      fetchGroups();
    }
  }, [visible, session?.user?.id]);

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

      // Get member counts for each group and check if villager is already a member
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

          // Check if villager is already a member of this group
          const { data: existingMember, error: memberError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', villagerId)
            .single();

          if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error checking group membership:', memberError);
          }

          // Only include groups where villager is not already a member
          if (existingMember) {
            return null;
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

  const handleAddToGroup = async (groupId: string) => {
    if (!session?.user?.id || isAdding) return;

    try {
      setIsAdding(groupId);
      setError(null);

      // Add villager to the group
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: villagerId
        });

      if (error) {
        console.error('Error adding villager to group:', error);
        setError('Kunde inte lägga till villager i gruppen');
        return;
      }

      // Remove the group from the list since villager is now a member
      setGroups(prev => prev.filter(g => g.id !== groupId));

      // Show success feedback (you could add a toast here)
      console.log(`${villagerName} added to group successfully`);

    } catch (err) {
      console.error('Error adding villager to group:', err);
      setError('Ett fel uppstod vid tillägg av villager');
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LÄGG TILL I GRUPP</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color="#FF69B4" size={24} />
          </Pressable>
        </View>

        <View style={styles.villagerInfo}>
          <Text style={styles.villagerName}>{villagerName}</Text>
          <Text style={styles.villagerSubtext}>Välj en grupp att lägga till villager i</Text>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <ScrollView style={styles.groupsList} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#FF69B4" />
              <Text style={styles.loadingText}>Laddar dina hoods...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga tillgängliga hoods</Text>
              <Text style={styles.emptySubtext}>
                {villagerName} är redan medlem i alla dina hoods eller så har du inga hoods att lägga till i.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.id} style={styles.groupItem}>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupDetails}>
                    {group.memberCount} medlemmar | Skapad {group.createdAt}
                  </Text>
                </View>
                <Pressable 
                  style={[
                    styles.addButton,
                    isAdding === group.id && styles.addButtonLoading
                  ]}
                  onPress={() => handleAddToGroup(group.id)}
                  disabled={isAdding === group.id}
                >
                  {isAdding === group.id ? (
                    <>
                      <ActivityIndicator size="small\" color="#FF69B4" />
                      <Text style={styles.addButtonTextLoading}>Lägger till...</Text>
                    </>
                  ) : (
                    <>
                      <Check size={16} color="#FF69B4" />
                      <Text style={styles.addButtonText}>Lägg till</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  closeButton: {
    padding: 5,
  },
  villagerInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  villagerName: {
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  villagerSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  groupsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
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
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  addButtonLoading: {
    backgroundColor: '#FFF8FC',
    borderColor: '#FFB3D9',
  },
  addButtonText: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  addButtonTextLoading: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    opacity: 0.7,
  },
});