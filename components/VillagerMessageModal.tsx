import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { X, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

type Props = {
  visible: boolean;
  onClose: () => void;
  villager: {
    id: string;
    name: string;
  };
};

export default function VillagerMessageModal({ visible, onClose, villager }: Props) {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleSendMessage = () => {
    onClose();
    // Navigate directly to the chat screen with the villager
    router.push(`/messages/${villager.id}`);
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
            <View style={styles.headerContent}>
              <MessageCircle size={24} color="#FF69B4" />
              <Text style={styles.headerTitle}>SKICKA MEDDELANDE</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#666" size={24} />
            </Pressable>
          </View>

          <View style={styles.villagerInfo}>
            <Text style={styles.villagerName}>{villager.name}</Text>
            <Text style={styles.villagerSubtext}>
              Öppna chatten med {villager.name.split(' ')[0]} för att skicka meddelanden
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.messageButton} onPress={handleSendMessage}>
              <View style={styles.buttonContent}>
                <MessageCircle size={24} color="#FF69B4" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Öppna chat</Text>
                  <Text style={styles.buttonSubtitle}>
                    Skicka meddelanden till {villager.name.split(' ')[0]}
                  </Text>
                </View>
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
    minHeight: 250,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  villagerInfo: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  villagerName: {
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  villagerSubtext: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  messageButton: {
    backgroundColor: '#FFF8FC',
    borderWidth: 2,
    borderColor: '#FF69B4',
    borderRadius: 16,
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  buttonSubtitle: {
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