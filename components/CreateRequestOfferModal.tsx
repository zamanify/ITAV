import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { X, MessageSquare, Gift } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
};

export default function CreateRequestOfferModal({ visible, onClose, groupId, groupName }: Props) {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleCreateRequest = () => {
    onClose();
    // Navigate to create request page with preselected hood
    router.push({
      pathname: '/create-request',
      params: { preselectedHood: groupId }
    });
  };

  const handleCreateOffer = () => {
    onClose();
    // Navigate to create offer page with preselected hood
    router.push({
      pathname: '/create-offer',
      params: { preselectedHood: groupId }
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SKAPA FÖRFRÅGAN</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#666" size={24} />
            </Pressable>
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupSubtext}>
              Vad vill du skapa för denna grupp?
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <Pressable style={styles.optionButton} onPress={handleCreateRequest}>
              <View style={styles.optionIconContainer}>
                <MessageSquare size={32} color="#FF69B4" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Skapa förfrågan</Text>
                <Text style={styles.optionDescription}>
                  Be om hjälp från medlemmarna i {groupName}
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.optionButton} onPress={handleCreateOffer}>
              <View style={styles.optionIconContainer}>
                <Gift size={32} color="#87CEEB" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Skapa erbjudande</Text>
                <Text style={styles.optionDescription}>
                  Erbjud din hjälp till medlemmarna i {groupName}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Avbryt</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  groupInfo: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  groupName: {
    fontSize: 24,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  groupSubtext: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
  },
});