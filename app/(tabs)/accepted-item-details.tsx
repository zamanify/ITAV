import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, User, MessageCircle, Clock, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { fetchPairBalance } from '@/lib/balance';
import UserMessageModal from '../../components/UserMessageModal';

SplashScreen.preventAutoHideAsync();

type RequestData = {
  id: string;
  message: string;
  is_offer: boolean;
  time_slot: string | null;
  flexible: boolean;
  minutes_logged: number;
  status: string;
  created_at: string;
  requester: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    minute_balance: number;
    created_at: string;
  };
};

export default function AcceptedItemDetailsScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;
  const requesterId = params.requesterId as string;

  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairBalance, setPairBalance] = useState<number | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id && itemId) {
      fetchRequestData();
    }
  }, [session?.user?.id, itemId]);

  useEffect(() => {
    const loadBalance = async () => {
      if (session?.user?.id && requesterId) {
        const balance = await fetchPairBalance(session.user.id, requesterId);
        if (balance !== null) setPairBalance(balance);
      }
    };

    loadBalance();
  }, [session?.user?.id, requesterId]);

  const fetchRequestData = async () => {
    if (!itemId || !session?.user?.id) return;

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
          created_at,
          requester:requester_id(
            id,
            first_name,
            last_name,
            phone_number,
            minute_balance,
            created_at
          )
        `)
        .eq('id', itemId)
        .eq('accepted_responder_id', session.user.id) // Ensure current user is the accepted responder
        .single();

      if (fetchError) {
        console.error('Error fetching request data:', fetchError);
        setError('Kunde inte hämta ärendeinformation');
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

  const handleSendMessage = () => {
    setMessageModalVisible(true);
  };

  const handleCloseMessageModal = () => {
    setMessageModalVisible(false);
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

  const getBalanceText = () => {
    if (!requestData?.requester || pairBalance === null) return '';

    if (pairBalance === 0) return 'NI HAR 0 MIN MELLAN ER';
    if (pairBalance > 0)
      return `${requestData.requester.first_name} ÄR SKYLDIG DIG ${pairBalance} MIN`;
    return `DU ÄR SKYLDIG ${requestData.requester.first_name} ${Math.abs(pairBalance)} MIN`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#87CEEB" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>LADDAR ÄRENDE...</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#87CEEB" />
          <Text style={styles.loadingText}>Hämtar ärendeinformation...</Text>
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
          <Text style={styles.errorText}>{error || 'Kunde inte ladda ärende'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchRequestData}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#87CEEB" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>
            ACCEPTERAT {requestData.is_offer ? 'ERBJUDANDE' : 'FÖRFRÅGAN'}
          </Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Request/Offer Details */}
          <View style={styles.requestDetailsContainer}>
            <Text style={styles.requestTitle}>
              {requestData.is_offer ? 'ERBJUDANDE' : 'FÖRFRÅGAN'} FRÅN {requestData.requester.first_name.toUpperCase()}
            </Text>
            <Text style={styles.requestMessage}>{requestData.message}</Text>
            
            <View style={styles.requestMeta}>
              <View style={styles.metaRow}>
                <Clock size={16} color="#87CEEB" />
                <Text style={styles.metaText}>
                  {requestData.flexible ? 'Flexibel tid' : formatTimeSlot(requestData.time_slot)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Calendar size={16} color="#87CEEB" />
                <Text style={styles.metaText}>
                  Skapad {formatDate(requestData.created_at)}
                </Text>
              </View>
              <Text style={styles.estimatedTime}>
                VÄRDE: CA {requestData.minutes_logged} MIN
              </Text>
              <Text style={styles.balanceText}>{getBalanceText()}</Text>
            </View>
          </View>

          {/* Requester Info */}
          <View style={styles.requesterInfoContainer}>
            <Text style={styles.requesterTitle}>KONTAKTINFORMATION</Text>
            <View style={styles.requesterCard}>
              <View style={styles.requesterAvatar}>
                <User size={32} color="#87CEEB" />
              </View>
              <View style={styles.requesterDetails}>
                <Text style={styles.requesterName}>
                  {requestData.requester.first_name} {requestData.requester.last_name}
                </Text>
                <Text style={styles.requesterPhone}>
                  {requestData.requester.phone_number}
                </Text>
                <Text style={styles.requesterBalance}>
                  Saldo: {requestData.requester.minute_balance > 0 ? '+' : ''}{requestData.requester.minute_balance} min
                </Text>
              </View>
              <Pressable 
                style={styles.messageButton}
                onPress={handleSendMessage}
              >
                <MessageCircle size={20} color="#87CEEB" />
                <Text style={styles.messageButtonText}>Meddelande</Text>
              </Pressable>
            </View>
          </View>

          {/* Status Info */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>STATUS</Text>
            <Text style={styles.statusText}>
              Du har accepterat detta {requestData.is_offer ? 'erbjudande' : 'förfrågan'}. 
              Kontakta {requestData.requester.first_name} för att koordinera genomförandet.
            </Text>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </View>

      {/* Message Modal */}
      <UserMessageModal
        visible={messageModalVisible}
        onClose={handleCloseMessageModal}
        user={{
          id: requestData.requester.id,
          name: `${requestData.requester.first_name} ${requestData.requester.last_name}`
        }}
        requestInfo={{
          id: requestData.id,
          title: requestData.message,
          isOffer: requestData.is_offer
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
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 20,
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
  requestDetailsContainer: {
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  requestTitle: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
  },
  requestMessage: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 26,
    marginBottom: 16,
  },
  requestMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E4F1FF',
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginTop: 8,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginTop: 8,
    fontWeight: '600',
  },
  requesterInfoContainer: {
    marginBottom: 20,
  },
  requesterTitle: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
  },
  requesterCard: {
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requesterAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E4F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  requesterDetails: {
    flex: 1,
  },
  requesterName: {
    fontSize: 18,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  requesterPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 2,
  },
  requesterBalance: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  messageButtonText: {
    color: '#87CEEB',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  statusContainer: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#D6EFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 24,
  },
  spacer: {
    height: 20,
  },
});