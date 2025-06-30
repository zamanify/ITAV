import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchPairBalance } from '@/lib/balance';
import { AuthContext } from '@/contexts/AuthContext';
import UserMessageModal from './UserMessageModal';

type RequestOfferModalProps = {
  visible: boolean;
  onClose: () => void;
  data: {
    id: string;
    type: 'request' | 'offer';
    senderName: string;
    message: string;
    date: string;
    time: string;
    urgency: string;
    estimatedTime: number;
    balance: number;
    groupName?: string;
    senderId: string;
  };
};

export default function RequestOfferModal({ visible, onClose, data }: RequestOfferModalProps) {
  const { session } = useContext(AuthContext);
  const [pairBalance, setPairBalance] = useState<number | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);

  useEffect(() => {
    const logView = async () => {
      if (visible && session?.user?.id && data.senderId !== session.user.id) {
        const { error } = await supabase
          .from('request_responses')
          .upsert(
            {
              request_id: data.id,
              responder_id: session.user.id,
              status: 'viewed'
            },
            {
              onConflict: 'request_id,responder_id',
              ignoreDuplicates: true
            }
          );
        if (error) console.error('Failed to register view:', error);
      }
    };

    logView();
  }, [visible, session?.user?.id, data.id]);

  useEffect(() => {
    const loadBalance = async () => {
      if (visible && session?.user?.id && data.senderId) {
        const balance = await fetchPairBalance(session.user.id, data.senderId);
        if (balance !== null) setPairBalance(balance);
      }
    };

    loadBalance();
  }, [visible, session?.user?.id, data.senderId]);
  
  const getBalanceText = () => {
    if (pairBalance === null) return '';
    if (pairBalance === 0) return 'NI HAR 0 MIN MELLAN ER';
    if (pairBalance > 0)
      return `${data.senderName} ÄR SKYLDIG DIG ${pairBalance} MIN`;
    return `DU ÄR SKYLDIG ${data.senderName} ${Math.abs(pairBalance)} MIN`;
  };

  const handleRespondToItem = () => {
    onClose();
    // Navigate to the response screen with the necessary parameters
    router.push({
      pathname: '/respond-to-item',
      params: {
        itemId: data.id,
        senderId: data.senderId,
        itemType: data.type
      }
    });
  };

  const handleSendMessage = () => {
    setMessageModalVisible(true);
  };

  const handleCloseMessageModal = () => {
    setMessageModalVisible(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.senderName}>{data.senderName}</Text>
            {data.groupName && (
              <Text style={styles.groupName}>MEDLEM I {data.groupName}</Text>
            )}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X color="#87CEEB" size={24} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>{data.message}</Text>

            <View style={styles.detailsContainer}>
              <Text style={styles.dateTime}>
                {data.date} {data.time}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>AKUTNIVÅ:</Text>
                <Text style={styles.detailValue}>{data.urgency}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VÄRDE:</Text>
                <Text style={styles.detailValue}>CA {data.estimatedTime} MIN</Text>
              </View>
              <Text style={styles.balanceText}>{getBalanceText()}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable style={styles.actionButton} onPress={handleRespondToItem}>
                <Text style={styles.actionButtonText}>
                  {data.type === 'request' 
                    ? 'RÄCK UPP HANDEN OCH ERBJUD DIG'
                    : 'RÄCK UPP HANDEN OCH TA EMOT'
                  }
                </Text>
              </Pressable>

              <Pressable style={styles.messageButton} onPress={handleSendMessage}>
                <Text style={styles.messageButtonText}>SKICKA MEDDELANDE</Text>
              </Pressable>

              <Pressable style={styles.closeModalButton} onPress={onClose}>
                <Text style={styles.closeModalButtonText}>STÄNG</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Message Modal */}
      <UserMessageModal
        visible={messageModalVisible}
        onClose={handleCloseMessageModal}
        user={{
          id: data.senderId,
          name: data.senderName
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  senderName: {
    fontSize: 32,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  message: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 30,
    lineHeight: 28,
  },
  detailsContainer: {
    marginBottom: 40,
  },
  dateTime: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  balanceText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#87CEEB',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  messageButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  messageButtonText: {
    color: '#87CEEB',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  closeModalButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  closeModalButtonText: {
    color: '#87CEEB',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});