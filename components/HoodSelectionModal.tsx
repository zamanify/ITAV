import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal } from 'react-native';
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
  onSelectHoods: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
};

export default function HoodSelectionModal({ visible, onClose, onSelectHoods, initialSelectedIds = [] }: Props) {
  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHoods, setSelectedHoods] = useState<string[]>(initialSelectedIds);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedHoods(initialSelectedIds);
  }, [initialSelectedIds]);

  useEffect(() => {
    if (visible && session?.user?.id) {
      fetchGroups();
    }
  }, [visible, session?.user?.id]);

  const fetchGroups = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

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
        return;
      }

      // Get member counts for each group (excluding blocked users from count)
      const groupsWithCounts = await Promise.all(
        (groupMemberships || []).map(async (membership) => {
          const group = membership.group;
          if (!group) return null;

          // Get all members of this group
          const { data: allMembers, error: membersError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', group.id);

          if (membersError) {
            console.error('Error fetching group members:', membersError);
            return null;
          }

          // Get blocked user IDs to filter out from count
          const [blockedByMeResult, blockedByThemResult] = await Promise.all([
            supabase
              .from('user_blocks')
              .select('blocked_id')
              .eq('blocker_id', session.user.id),
            supabase
              .from('user_blocks')
              .select('blocker_id')
              .eq('blocked_id', session.user.id)
          ]);

          const blockedByMe = new Set((blockedByMeResult.data || []).map(block => block.blocked_id));
          const blockedByThem = new Set((blockedByThemResult.data || []).map(block => block.blocker_id));

          // Count only non-blocked members
          const nonBlockedMembers = (allMembers || []).filter(member => 
            !blockedByMe.has(member.user_id) && !blockedByThem.has(member.user_id)
          );

          return {
            id: group.id,
            name: group.name,
            memberCount: nonBlockedMembers.length,
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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHoods = groups.filter(hood =>
    hood.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected = filteredHoods.length > 0 && 
    filteredHoods.every(hood => selectedHoods.includes(hood.id));

  const toggleHoodSelection = (hoodId: string) => {
    setSelectedHoods(prev =>
      prev.includes(hoodId)
        ? prev.filter(id => id !== hoodId)
        : [...prev, hoodId]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedHoods(prev => 
        prev.filter(id => !filteredHoods.find(h => h.id === id))
      );
    } else {
      setSelectedHoods(prev => [
        ...prev,
        ...filteredHoods.map(h => h.id).filter(id => !prev.includes(id))
      ]);
    }
  };

  const handleConfirm = () => {
    onSelectHoods(selectedHoods);
    onClose();
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
          <Text style={styles.headerTitle}>VÄLJ HOODS</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color="#FF69B4" size={24} />
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök bland dina hoods"
          placeholderTextColor="#999"
        />

        {!isLoading && groups.length > 0 && (
          <Pressable
            style={styles.selectAllContainer}
            onPress={toggleSelectAll}
          >
            <View style={[
              styles.checkbox,
              isAllSelected && styles.checkboxSelected
            ]}>
              {isAllSelected && <Check size={16} color="white" />}
            </View>
            <Text style={styles.selectAllText}>VÄLJ ALLA</Text>
          </Pressable>
        )}

        <ScrollView style={styles.hoodsList}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Laddar hoods...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga hoods att välja från</Text>
              <Text style={styles.emptySubtext}>
                Du behöver skapa eller gå med i hoods först
              </Text>
            </View>
          ) : filteredHoods.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga hoods matchar sökningen</Text>
            </View>
          ) : (
            filteredHoods.map((hood) => (
              <Pressable
                key={hood.id}
                style={styles.hoodItem}
                onPress={() => toggleHoodSelection(hood.id)}
              >
                <View style={styles.hoodInfo}>
                  <Text style={styles.hoodName}>{hood.name}</Text>
                  <Text style={styles.hoodDetails}>
                    {hood.memberCount} medlemmar | Skapad {hood.createdAt}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedHoods.includes(hood.id) && styles.checkboxSelected
                ]}>
                  {selectedHoods.includes(hood.id) && (
                    <Check size={16} color="white" />
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            Bekräfta val ({selectedHoods.length})
          </Text>
        </Pressable>
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  selectAllText: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    marginLeft: 12,
  },
  hoodsList: {
    flex: 1,
    paddingHorizontal: 20,
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
  },
  hoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  hoodInfo: {
    flex: 1,
  },
  hoodName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  hoodDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF69B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF69B4',
  },
  confirmButton: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});