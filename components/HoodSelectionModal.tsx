import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useState, useEffect } from 'react';

type Group = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectHoods: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
};

const mockHoods: Group[] = [
  {
    id: '1',
    name: 'Familjen',
    memberCount: 5,
    createdAt: '28 maj 2025'
  },
  {
    id: '2',
    name: 'Bästisarna',
    memberCount: 3,
    createdAt: '29 maj 2025'
  },
  {
    id: '3',
    name: 'Grannar',
    memberCount: 8,
    createdAt: '4 mars 2025'
  }
];

export default function HoodSelectionModal({ visible, onClose, onSelectHoods, initialSelectedIds = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHoods, setSelectedHoods] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    setSelectedHoods(initialSelectedIds);
  }, [initialSelectedIds]);

  const filteredHoods = mockHoods.filter(hood =>
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

        <ScrollView style={styles.hoodsList}>
          {filteredHoods.map((hood) => (
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
  hoodsList: {
    flex: 1,
    paddingHorizontal: 20,
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