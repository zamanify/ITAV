import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useState, useEffect } from 'react';

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

const mockVillagers: Villager[] = [
  {
    id: '1',
    name: 'Billie Jansson',
    phoneNumber: '+46707865400',
    memberSince: '28 maj 2025',
    balance: 23,
    status: 'connected'
  },
  {
    id: '2',
    name: 'Eija Skarsgård',
    phoneNumber: '+46761727505',
    memberSince: '29 maj 2025',
    balance: 0,
    status: 'connected'
  },
  {
    id: '3',
    name: 'Alexander Skarsgård',
    phoneNumber: '+9723017744',
    memberSince: '4 mars 2025',
    balance: -125,
    status: 'connected'
  }
];

export default function VillagerSelectionModal({ visible, onClose, onSelectVillagers, initialSelectedIds = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    setSelectedVillagers(initialSelectedIds);
  }, [initialSelectedIds]);

  const filteredVillagers = mockVillagers.filter(villager =>
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

        <ScrollView style={styles.villagersList}>
          {filteredVillagers.map((villager) => (
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
          ))}
        </ScrollView>

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Bekräfta val</Text>
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