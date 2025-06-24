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
  group: {
    id: string;
    name: string;
  };
};

export default function GroupMessageModal({ visible, onClose, group }: Props) {
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

  const handleSendGroupMessage = async () => {
    if (!session?.user?.id || !message.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      // Get all group members except the sender
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .neq('user_id', session.user.id);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        setError('Kunde inte hämta gruppmedlemmar');
        return;
      }

      if (!groupMembers || groupMembers.length === 0) {
        setError('Inga andra medlemmar i gruppen att skicka till');
        return;
      }

      // Get blocked user IDs to filter out
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

      // Filter out blocked users
      const validMembers = groupMembers.filter(member => 
        !blockedByMe.has(member.user_id) && !blockedByThem.has(member.user_id)
      );

      if (validMembers.length === 0) {
        setError('Inga tillgängliga medlemmar att skicka till');
        return;
      }

      // Create individual messages for each group member
      const messagesToInsert = validMembers.map(member => ({
        sender_id: session.user.id,
        receiver_id: member.user_id,
        message_text: message.trim(),
        via_group_id: group.id
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error('Error sending group messages:', insertError);
        setError('Kunde inte skicka meddelandet till gruppen');
        return;
      }

      // Reset form and close modal
      setMessage('');
      onClose();

      // Navigate to messages screen to show the sent messages
      router.replace('/messages');

    } catch (err) {
      console.error('Error sending group message:', err);
      setError('Ett fel uppstod vid skickande av gruppmeddelande');
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
              <Text style={styles.headerTitle}>SKICKA TILL GRUPP</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X color="#666" size={24} />
            </Pressable>
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupSubtext}>
              Meddelandet skickas till alla medlemmar i gruppen
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
              onPress={handleSendGroupMessage}
              disabled={!message.trim() || isSending}
            >
              <Send size={20} color={(!message.trim() || isSending) ? "#999" : "white"} />
              <Text style={[
                styles.sendButtonText,
                (!message.trim() || isSending) && styles.sendButtonTextDisabled
              ]}>
                {isSending ? 'Skickar...' : 'Skicka till alla'}
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
  groupInfo: {
    marginBottom: 24,
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
