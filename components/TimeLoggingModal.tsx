import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { X, Circle, CircleCheck as CheckCircle, Send } from 'lucide-react-native';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

type Props = {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  requesterId: string;
  responderId: string;
  estimatedMinutes: number;
  requesterFirstName: string;
  responderFirstName: string;
  onConfirm: () => void;
};

export default function TimeLoggingModal({
  visible,
  onClose,
  requestId,
  requesterId,
  responderId,
  estimatedMinutes,
  requesterFirstName,
  responderFirstName,
  onConfirm,
}: Props) {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [selectedOption, setSelectedOption] = useState<'log' | 'no_log'>('log');
  const [minutesToLog, setMinutesToLog] = useState(String(estimatedMinutes));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMinutesToLog(String(estimatedMinutes));
      setSelectedOption('log');
      setError(null);
    }
  }, [visible, estimatedMinutes]);

  if (!fontsLoaded) {
    return null;
  }

  const handleMinutesChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    const num = Number(cleanedText);

    if (cleanedText === '') {
      setMinutesToLog('');
    } else if (num >= 0 && num <= 9999) {
      setMinutesToLog(cleanedText);
    } else if (num > 9999) {
      setMinutesToLog('9999');
    }
    
    // Automatically select the log option when user types
    if (selectedOption !== 'log') {
      setSelectedOption('log');
    }
  };

  const handleInputFocus = () => {
    setSelectedOption('log');
  };

  const handleConfirmTimeLogging = async () => {
    if (!session?.user?.id || isProcessing) return;

    let finalMinutes = 0;
    if (selectedOption === 'log') {
      finalMinutes = Number(minutesToLog);
      if (isNaN(finalMinutes) || finalMinutes < 0 || finalMinutes > 9999) {
        setError('Ange ett giltigt antal minuter mellan 0 och 9999.');
        return;
      }
    }

    try {
      setIsProcessing(true);
      setError(null);

      // 1. Update request status to 'completed'
      const { error: updateRequestError } = await supabase
        .from('requests')
        .update({ status: 'completed' })
        .eq('id', requestId)
        .eq('requester_id', session.user.id);

      if (updateRequestError) {
        console.error('Error updating request status:', updateRequestError);
        setError('Kunde inte uppdatera ärendestatus. Försök igen.');
        return;
      }

      // 2. If minutes > 0, create transaction and update balances
      if (finalMinutes > 0) {
        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            from_user: requesterId,
            to_user: responderId,
            minutes: finalMinutes,
            related_request: requestId
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          setError('Kunde inte skapa transaktion. Försök igen.');
          return;
        }

        // Note: The balance updates are handled automatically by the trigger_balance_transfer trigger
        // which is fired after inserting into transactions table
      }

      let successMessage = '';
      if (finalMinutes > 0) {
        successMessage = `Ärendet är markerat som klart och ${finalMinutes} minuter har överförts till ${responderFirstName}.`;
      } else {
        successMessage = 'Ärendet är markerat som klart. Ingen tid överfördes.';
      }

      if (Platform.OS === 'web') {
        alert(successMessage);
      } else {
        Alert.alert('Klart!', successMessage);
      }

      onConfirm(); // Call the callback to navigate or refresh
      onClose(); // Close the modal
    } catch (err) {
      console.error('Unexpected error during time logging:', err);
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfirmationText = () => {
    if (selectedOption === 'no_log') {
      return 'Markera som klart utan tidsöverföring';
    }
    
    const minutes = Number(minutesToLog);
    if (isNaN(minutes) || minutes === 0) {
      return 'Markera som klart utan tidsöverföring';
    }
    
    return `Överför ${minutes} minuter till ${responderFirstName}`;
  };

  const isSendButtonDisabled = isProcessing || 
    (selectedOption === 'log' && (minutesToLog === '' || Number(minutesToLog) < 0 || Number(minutesToLog) > 9999));

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
            <Text style={styles.headerTitle}>MARKERA SOM KLART</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#666" size={24} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Välj hur många minuter som ska överföras till {responderFirstName} för detta ärende.
          </Text>

          <View style={styles.optionsContainer}>
            {/* Option 1: Log time */}
            <Pressable
              style={styles.optionRow}
              onPress={() => setSelectedOption('log')}
            >
              {selectedOption === 'log' ? (
                <CheckCircle size={24} color="#FF69B4" />
              ) : (
                <Circle size={24} color="#999" />
              )}
              <Text style={styles.optionText}>Logga</Text>
              <TextInput
                style={[
                  styles.minutesInput, 
                  selectedOption === 'no_log' && styles.minutesInputDisabled
                ]}
                value={minutesToLog}
                onChangeText={handleMinutesChange}
                onFocus={handleInputFocus}
                keyboardType="numeric"
                maxLength={4}
                editable={true}
                placeholder="0"
                placeholderTextColor="#999"
              />
              <Text style={styles.optionText}>minuter</Text>
            </Pressable>

            {/* Option 2: No time logging */}
            <Pressable
              style={styles.optionRow}
              onPress={() => setSelectedOption('no_log')}
            >
              {selectedOption === 'no_log' ? (
                <CheckCircle size={24} color="#FF69B4" />
              ) : (
                <Circle size={24} color="#999" />
              )}
              <Text style={styles.optionText}>Logga inte tid för {responderFirstName}</Text>
            </Pressable>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationText}>
              {getConfirmationText()}
            </Text>
          </View>

          <Pressable
            style={[styles.sendButton, isSendButtonDisabled && styles.sendButtonDisabled]}
            onPress={handleConfirmTimeLogging}
            disabled={isSendButtonDisabled}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
            <Text style={styles.sendButtonText}>
              {isProcessing ? 'Skickar...' : 'Skicka in loggad tid'}
            </Text>
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
    maxHeight: '80%',
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
  description: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginLeft: 12,
  },
  minutesInput: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    width: 80,
    textAlign: 'center',
    marginLeft: 12,
    marginRight: 8,
    backgroundColor: 'white',
  },
  minutesInputDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E5E5E5',
    color: '#999',
  },
  confirmationContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E4F1FF',
  },
  confirmationText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
  },
  sendButton: {
    backgroundColor: '#FF69B4',
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
});