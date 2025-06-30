import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { X, MessageCircle, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
  };
  requestInfo?: {
    id: string;
    title: string;
    isOffer: boolean;
  };
};

export default function UserMessageModal({ visible, onClose, user, requestInfo }: Props) {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fontsLoaded) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!session?.user?.id || !message.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      // Check if users are blocked
      const { data: blockCheck, error: blockError } = await supabase
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_id.eq.${session.user.id},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${session.user.id})`)
        .limit(1);

      if (blockError) {
        console.error('Error checking block status:', blockError);
        setError('Kunde inte kontrollera blockstatus');
        return;
      }

      if (blockCheck && blockCheck.length > 0) {
        setError('Du kan inte skicka meddelanden till denna användare');
        return;
      }

      // Send the message
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: session.user.id,
          receiver_id: user.id,
          message_text: message.trim(),
          via_group_id: null, // Direct message, not via group
          via_request_id: requestInfo?.id || null, // Add the request ID if available
          via_request_title: requestInfo?.title || null, // Add the request title if available
          via_is_offer: requestInfo?.isOffer || null // Add whether it's an offer if available
        });

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Kunde inte skicka meddelandet');
        return;
      }

      // Reset form and close modal
      setMessage('');
      onClose();

      // Navigate to messages screen to show the sent message
      router.push('/messages');

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Ett fel uppstod vid skickande av meddelande');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MessageCircle size={24} color="#87CEEB" />
              <Text style={styles.headerTitle}>SKICKA MEDDELANDE</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X color="#666" size={24} />
            </Pressable>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userSubtext}>
              Skicka ett meddelande till {user.name.split(' ')[0]}
              {requestInfo ? ` angående ${requestInfo.isOffer ? 'erbjudandet' : 'förfrågan'}` : ''}
            </Text>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>DITT MEDDELANDE</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Skriv ditt meddelande här..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable 
              style={[
                styles.sendButton,
                (!message.trim() || isSending) && styles.sendButtonDisabled
              ]} 
              onPress={handleSendMessage}
              disabled={!message.trim() || isSending}
            >
              <Send size={20} color={(!message.trim() || isSending) ? "#999" : "white"} />
              <Text style={[
                styles.sendButtonText,
                (!message.trim() || isSending) && styles.sendButtonTextDisabled
              ]}>
                {isSending ? 'Skickar...' : 'Skicka meddelande'}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Avbryt</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
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
  userInfo: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userName: {
    fontSize: 24,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  userSubtext: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  messageContainer: {
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  sendButton: {
    backgroundColor: '#87CEEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  sendButtonTextDisabled: {
    color: '#999',
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