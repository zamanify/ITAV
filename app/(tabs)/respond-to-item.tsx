import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { fetchPairBalance } from '@/lib/balance';


type RequestData = {
  id: string;
  message: string;
  is_offer: boolean;
  time_slot: string | null;
  flexible: boolean;
  minutes_logged: number;
  status: string;
  requester: {
    first_name: string;
    last_name: string;
    minute_balance: number;
  };
};

export default function RespondToItemScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;
  const senderId = params.senderId as string;
  const itemType = params.itemType as 'request' | 'offer';

  const [responseMessage, setResponseMessage] = useState('');
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairBalance, setPairBalance] = useState<number | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Reset message when itemId changes (new request/offer selected)
  useEffect(() => {
    setResponseMessage('');
    setError(null);
  }, [itemId]);

  useEffect(() => {
    if (session?.user?.id && itemId) {
      fetchRequestData();
    }
  }, [session?.user?.id, itemId]);

  useEffect(() => {
    const loadBalance = async () => {
      if (session?.user?.id && senderId) {
        const balance = await fetchPairBalance(session.user.id, senderId);
        if (balance !== null) setPairBalance(balance);
      }
    };

    loadBalance();
  }, [session?.user?.id, senderId]);

  const fetchRequestData = async () => {
    if (!itemId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('requests')
        .select(`
          id,
          message,
          is_offer,
          time_slot,
          flexible,
          minutes_logged,
          status,
          requester:requester_id(
            first_name,
            last_name,
            minute_balance
          )
        `)
        .eq('id', itemId)
        .single();

      if (fetchError) {
        console.error('Error fetching request data:', fetchError);
        setError('Kunde inte hämta information om förfrågan');
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

  const handleSendResponse = async () => {
    if (!session?.user?.id || !itemId || isSubmitting || !responseMessage.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Insert or update response in request_responses table
      const { error: responseError } = await supabase
        .from('request_responses')
        .upsert({
          request_id: itemId,
          responder_id: session.user.id,
          status: 'accepted',
          message: responseMessage.trim()
        }, {
          onConflict: 'request_id,responder_id'
        });

      if (responseError) {
        console.error('Error creating response:', responseError);
        setError('Kunde inte skicka ditt svar. Försök igen.');
        return;
      }

      // Navigate back to dashboard or previous screen
      router.back();
    } catch (err) {
      console.error('Error sending response:', err);
      setError('Ett fel uppstod vid skickande av svar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeSlot = (timeSlot: string | null) => {
    if (!timeSlot) return null;
    
    const date = new Date(timeSlot);
    return date.toLocaleString('sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBalanceText = () => {
    if (!requestData?.requester || pairBalance === null) return '';

    if (pairBalance === 0) return 'NI HAR 0 MIN MELLAN ER';
    if (pairBalance > 0)
      return `${requestData.requester.first_name} ÄR SKYLDIG DIG ${pairBalance} MIN`;
    return `DU ÄR SKYLDIG ${requestData.requester.first_name} ${Math.abs(pairBalance)} MIN`;
  };

  const getHeaderTitle = () => {
    if (!requestData) return '';
    
    const senderName = `${requestData.requester.first_name} ${requestData.requester.last_name}`.toUpperCase();
    return itemType === 'request' 
      ? `SVARA PÅ ${senderName}S FÖRFRÅGAN`
      : `SVARA PÅ ${senderName}S ERBJUDANDE`;
  };

  const getActionText = () => {
    return itemType === 'request' 
      ? 'ERBJUD DIN HJÄLP'
      : 'Ja, klart jag tar denna!';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#87CEEB" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>LADDAR...</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#87CEEB" />
          <Text style={styles.loadingText}>Hämtar information...</Text>
        </View>
      </View>
    );
  }

  if (error || !requestData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#87CEEB" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>FEL</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Kunde inte ladda data'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchRequestData}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#87CEEB" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Original Request/Offer Display */}
        <View style={styles.originalRequestContainer}>
          <Text style={styles.originalRequestTitle}>
            URSPRUNGLIG {itemType === 'request' ? 'FÖRFRÅGAN' : 'ERBJUDANDE'}
          </Text>
          <Text style={styles.originalRequestMessage}>{requestData.message}</Text>
          
          <View style={styles.requestDetails}>
            {requestData.time_slot && !requestData.flexible && (
              <Text style={styles.detailText}>
                TID: {formatTimeSlot(requestData.time_slot)}
              </Text>
            )}
            {requestData.flexible && (
              <Text style={styles.detailText}>TID: FLEXIBEL</Text>
            )}
            <Text style={styles.detailText}>
              VÄRDE: CA {requestData.minutes_logged} MIN
            </Text>
            <Text style={styles.balanceText}>{getBalanceText()}</Text>
          </View>
        </View>

        {/* Response Message Input */}
        <View style={styles.responseContainer}>
          <Text style={styles.responseTitle}>
            DITT MEDDELANDE TILL {requestData.requester.first_name.toUpperCase()}
          </Text>
          <Text style={styles.responseSubtitle}>
            Skriv ett kort meddelande om varför du vill {getActionText().toLowerCase()}
          </Text>
          
          <TextInput
            style={styles.messageInput}
            value={responseMessage}
            onChangeText={setResponseMessage}
            placeholder={`Hej ${requestData.requester.first_name}! Jag kan hjälpa till med...`}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {error && (
            <Text style={styles.errorMessage}>{error}</Text>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <Pressable 
        style={[
          styles.sendButton, 
          (!responseMessage.trim() || isSubmitting) && styles.sendButtonDisabled
        ]} 
        onPress={handleSendResponse}
        disabled={!responseMessage.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator size="small\" color="white" />
            <Text style={styles.sendButtonText}>Skickar...</Text>
          </>
        ) : (
          <>
            <Send size={20} color="white" />
            <Text style={styles.sendButtonText}>{getActionText()}</Text>
          </>
        )}
      </Pressable>
    </KeyboardAvoidingView>
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
    borderBottomColor: '#E4F1FF',
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
    paddingBottom: 100,
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
    backgroundColor: '#87CEEB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  originalRequestContainer: {
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  originalRequestTitle: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
  },
  originalRequestMessage: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 26,
    marginBottom: 16,
  },
  requestDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E4F1FF',
    paddingTop: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginTop: 8,
    fontWeight: '600',
  },
  responseContainer: {
    marginBottom: 20,
  },
  responseTitle: {
    fontSize: 16,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  responseSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 16,
    lineHeight: 20,
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
  errorMessage: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    marginTop: 10,
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
  sendButton: {
    backgroundColor: '#87CEEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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