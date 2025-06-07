import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  status: 'connected' | 'pending' | 'request_received' | 'blocked';
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectVillagers: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
};

export default function VillagerSelectionModal({ visible, onClose, onSelectVillagers, initialSelectedIds = [] }: Props) {
  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>(initialSelectedIds);
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedVillagers(initialSelectedIds);
  }, [initialSelectedIds]);

  useEffect(() => {
    if (visible && session?.user?.id) {
      fetchVillagers();
    }
  }, [visible, session?.user?.id]);

  const fetchVillagers = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVillagers = villagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  const isAllSelected = filteredVillagers.length > 0 && 
    filteredVillagers.every(villager => selectedVillagers.includes(villager.id));

  const toggleVillagerSelection = (villagerId: string) => {
    setSelectedVillagers(prev =>
      prev.includes(villagerId)
        ? prev.filter(id => id !== villagerId)
        : [...prev, villagerId]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVillagers(prev => 
        prev.filter(id => !filteredVillagers.find(v => v.id === id))
      );
    } else {
      setSelectedVillagers(prev => [
        ...prev,
        ...filteredVillagers.map(v => v.id).filter(id => !prev.includes(id))
      ]);
    }
  };

  const handleConfirm = () => {
    onSelectVillagers(selectedVillagers);
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
          <Text style={styles.headerTitle}>VÄLJ VILLAGERS</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color="#FF69B4" size={24} />
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök bland dina villagers"
          placeholderTextColor="#999"
        />

        {!isLoading && villagers.length > 0 && (
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

        <ScrollView style={styles.villagersList}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Laddar villagers...</Text>
            </View>
          ) : villagers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga villagers att välja från</Text>
              <Text style={styles.emptySubtext}>
                Du behöver ansluta till villagers först
              </Text>
            </View>
          ) : filteredVillagers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga villagers matchar sökningen</Text>
            </View>
          ) : (
            filteredVillagers.map((villager) => (
              <Pressable
                key={villager.id}
                style={styles.villagerItem}
                onPress={() => toggleVillagerSelection(villager.id)}
              >
                <View style={styles.villagerInfo}>
                  <Text style={styles.villagerName}>{villager.name}</Text>
                  <Text style={styles.villagerPhone}>{villager.phoneNumber}</Text>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedVillagers.includes(villager.id) && styles.checkboxSelected
                ]}>
                  {selectedVillagers.includes(villager.id) && (
                    <Check size={16} color="white" />
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            Bekräfta val ({selectedVillagers.length})
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
  villagersList: {
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
  villagerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  villagerInfo: {
    flex: 1,
  },
  villagerName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  villagerPhone: {
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