import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, User, MessageCircle, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';


type RequestData = {
  id: string;
  message: string;
  is_offer: boolean;
  time_slot: string | null;
  flexible: boolean;
  minutes_logged: number;
  status: string;
  created_at: string;
  requester_id: string;
  accepted_responder_id: string | null;
  responder: { // Joined data for the accepted responder
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    minute_balance: number;
    created_at: string;
  } | null;
};

export default function ManageRequestScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;

  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (session?.user?.id && requestId) {
      fetchRequestData();
    }
  }, [session?.user?.id, requestId]);

  const fetchRequestData = async () => {
    if (!requestId || !session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('requests')
        .select(`
          *,
          responder:accepted_responder_id(
            id,
            first_name,
            last_name,
            phone_number,
            minute_balance,
            created_at
          )
        `)
        .eq('id', requestId)
        .eq('requester_id', session.user.id) // Ensure current user is the requester
        .single();

      if (fetchError) {
        console.error('Error fetching request data:', fetchError);
        setError('Kunde inte hämta förfrågan');
        return;
      }

      setRequestData(data);
    } catch (err) {
      console.error('Error fetching request data:', err);
      setError('Ett fel uppstod vid hämtning av data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleCancelRequest = async () => {
    if (!requestData || !session?.user?.id || isProcessing) return;

    const performCancel = async () => {
      try {
        setIsProcessing(true);

        // 1. Update request status to 'open' and clear accepted_responder_id
        const { error: updateRequestError } = await supabase
          .from('requests')
          .update({
            status: 'open',
            accepted_responder_id: null
          })
          .eq('id', requestId);

        if (updateRequestError) {
          console.error('Error canceling request:', updateRequestError);
          setError('Kunde inte avbryta ärendet. Försök igen.');
          return;
        }

        // 2. Update the status of the previously accepted response to 'rejected'
        if (requestData.accepted_responder_id) {
          const { error: updateResponseError } = await supabase
            .from('request_responses')
            .update({ status: 'rejected' })
            .eq('request_id', requestId)
            .eq('responder_id', requestData.accepted_responder_id);

          if (updateResponseError) {
            console.error('Error updating response status on cancel:', updateResponseError);
          }
        }

        Alert.alert('Ärende avbrutet', 'Ärendet har återgått till öppen status.');
        router.replace('/(tabs)'); // Go back to dashboard

      } catch (err) {
        console.error('Error during cancel request:', err);
        setError('Ett fel uppstod vid avbrytande av ärende.');
      } finally {
        setIsProcessing(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = confirm('Är du säker på att du vill avbryta detta ärende?');
      if (confirmed) {
        await performCancel();
      }
    } else {
      Alert.alert(
        'Avbryt ärende',
        'Är du säker på att du vill avbryta detta ärende? Det kommer att återgå till öppen status.',
        [
          { text: 'Nej', style: 'cancel' },
          { text: 'Ja', onPress: performCancel },
        ]
      );
    }
  };

  const handleCompleteRequest = async () => {
    if (!requestData || !session?.user?.id || isProcessing || !requestData.responder) return;

    const performComplete = async () => {
      try {
        setIsProcessing(true);

        // 1. Update request status to 'completed'
        const { error: updateRequestError } = await supabase
          .from('requests')
          .update({ status: 'completed' })
          .eq('id', requestId);

        if (updateRequestError) {
          console.error('Error completing request:', updateRequestError);
          setError('Kunde inte markera ärendet som klart. Försök igen.');
          return;
        }

        // 2. Create a transaction with correct from_user and to_user based on request type
        const fromUser = requestData.is_offer
          ? requestData.responder.id  // For offers: responder gives minutes
          : requestData.requester_id; // For requests: requester gives minutes

        const toUser = requestData.is_offer
          ? requestData.requester_id  // For offers: requester receives minutes
          : requestData.responder.id; // For requests: responder receives minutes

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            from_user: fromUser,
            to_user: toUser,
            minutes: requestData.minutes_logged,
            related_request: requestData.id
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          setError('Kunde inte skapa transaktionen. Försök igen.');
          return;
        }

        // 3. Update minute balances for both users (this is handled by a database trigger on transactions table)
        //    No explicit client-side update needed here if trigger is set up.
        //    Assuming a trigger exists that updates users.minute_balance based on transactions.

        Alert.alert('Ärende klart!', 'Saldo har överförts.');
        router.replace('/(tabs)'); // Go back to dashboard

      } catch (err) {
        console.error('Error during complete request:', err);
        setError('Ett fel uppstod vid klar-markering av ärende.');
      } finally {
        setIsProcessing(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = confirm(`Är du säker på att du vill markera detta ärende som klart? ${requestData.minutes_logged} minuter kommer att överföras.`);
      if (confirmed) {
        await performComplete();
      }
    } else {
      Alert.alert(
        'Markera som klart',
        `Är du säker på att du vill markera detta ärende som klart? ${requestData.minutes_logged} minuter kommer att överföras.`,
        [
          { text: 'Nej', style: 'cancel' },
          { text: 'Ja', onPress: performComplete },
        ]
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  if (error || !requestData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#FF69B4" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>FEL</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Kunde inte ladda ärende'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchRequestData}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>HANTERA ÄRENDE</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Request/Offer Details */}
        <View style={styles.requestDetailsContainer}>
          <Text style={styles.requestTitle}>
            DIN {requestData.is_offer ? 'ERBJUDANDE' : 'FÖRFRÅGAN'}
          </Text>
          <Text style={styles.requestMessage}>{requestData.message}</Text>
          <View style={styles.requestMeta}>
            <Text style={styles.requestMetaText}>
              {requestData.minutes_logged} min • {requestData.flexible ? 'Flexibel tid' : formatDate(requestData.time_slot || '')}
            </Text>
          </View>
        </View>

        {/* Accepted Responder Info */}
        {requestData.responder ? (
          <View style={styles.responderInfoContainer}>
            <Text style={styles.responderTitle}>VALD VILLAGER</Text>
            <View style={styles.responderCard}>
              <View style={styles.responderAvatar}>
                <User size={32} color="#FF69B4" />
              </View>
              <View style={styles.responderDetails}>
                <Text style={styles.responderName}>
                  {requestData.responder.first_name} {requestData.responder.last_name}
                </Text>
                <Text style={styles.responderPhone}>
                  {requestData.responder.phone_number}
                </Text>
                <Text style={styles.responderBalance}>
                  Saldo: {requestData.responder.minute_balance > 0 ? '+' : ''}{requestData.responder.minute_balance} min
                </Text>
              </View>
              <Pressable style={styles.messageButton}>
                <MessageCircle size={20} color="#FF69B4" />
                <Text style={styles.messageButtonText}>Meddelande</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.noResponderContainer}>
            <Text style={styles.noResponderText}>Ingen villager vald ännu.</Text>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Pressable
          style={[styles.completeButton, isProcessing && styles.buttonDisabled]}
          onPress={handleCompleteRequest}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <CheckCircle size={20} color="white" />
          )}
          <Text style={styles.completeButtonText}>
            {isProcessing ? 'Markerar som klart...' : 'Markera som klart'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.cancelButton, isProcessing && styles.buttonDisabled]}
          onPress={handleCancelRequest}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FF4444" />
          ) : (
            <XCircle size={20} color="#FF4444" />
          )}
          <Text style={styles.cancelButtonText}>
            {isProcessing ? 'Avbryter...' : 'Avbryt ärende'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4F1',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 120, // Space for action buttons
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  requestDetailsContainer: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  requestTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  requestMessage: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 24,
    marginBottom: 12,
  },
  requestMeta: {
    borderTopWidth: 1,
    borderTopColor: '#FFE4F1',
    paddingTop: 12,
  },
  requestMetaText: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
  },
  responderInfoContainer: {
    marginBottom: 20,
  },
  responderTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
  },
  responderCard: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  responderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  responderDetails: {
    flex: 1,
  },
  responderName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  responderPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 2,
  },
  responderBalance: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  messageButtonText: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  noResponderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    marginBottom: 20,
  },
  noResponderText: {
    fontSize: 16,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
  },
  spacer: {
    height: 20,
  },
  actionContainer: {
    padding: 20,
    gap: 12,
  },
  completeButton: {
    backgroundColor: '#4CAF50', // Green for complete
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF4444', // Red for cancel
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  cancelButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});