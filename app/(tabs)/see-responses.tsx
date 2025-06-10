import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, MessageCircle, User, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type ResponseData = {
  id: string;
  message: string;
  status: string;
  created_at: string;
  responder: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    minute_balance: number;
    created_at: string;
  };
};

type RequestData = {
  id: string;
  message: string;
  is_offer: boolean;
  time_slot: string | null;
  flexible: boolean;
  minutes_logged: number;
  status: string;
  created_at: string;
};

export default function SeeResponsesScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;

  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id && requestId) {
      fetchResponsesAndRequest();
    }
  }, [session?.user?.id, requestId]);

  const fetchResponsesAndRequest = async () => {
    if (!requestId || !session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch the original request/offer data
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .eq('requester_id', session.user.id) // Ensure user owns this request
        .single();

      if (requestError) {
        console.error('Error fetching request data:', requestError);
        setError('Kunde inte hämta förfrågan');
        return;
      }

      setRequestData(requestData);

      // Fetch all responses to this request
      const { data: responsesData, error: responsesError } = await supabase
        .from('request_responses')
        .select(`
          id,
          message,
          status,
          created_at,
          responder:responder_id(
            id,
            first_name,
            last_name,
            phone_number,
            minute_balance,
            created_at
          )
        `)
        .eq('request_id', requestId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
        setError('Kunde inte hämta svar');
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

      // Filter out responses from blocked users
      const filteredResponses = (responsesData || []).filter(response => {
        const responderId = response.responder?.id;
        return responderId && 
               !blockedByMe.has(responderId) && 
               !blockedByThem.has(responderId);
      });

      setResponses(filteredResponses);
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const handleViewResponse = (response: ResponseData) => {
    router.push({
      pathname: '/view-response',
      params: {
        responseId: response.id,
        requestId: requestId,
        responderId: response.responder.id
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHeaderTitle = () => {
    if (!requestData) return 'SVAR';
    
    const count = responses.length;
    if (count === 0) return 'INGA SVAR ÄNNU';
    if (count === 1) return '1 SVAR';
    return `${count} SVAR`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#FF69B4" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>LADDAR SVAR...</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Hämtar svar...</Text>
        </View>
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
          <Text style={styles.errorText}>{error || 'Kunde inte ladda data'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchResponsesAndRequest}>
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
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Original Request/Offer Summary */}
        <View style={styles.originalRequestContainer}>
          <Text style={styles.originalRequestTitle}>
            DIN {requestData.is_offer ? 'ERBJUDANDE' : 'FÖRFRÅGAN'}
          </Text>
          <Text style={styles.originalRequestMessage} numberOfLines={2}>
            {requestData.message}
          </Text>
          <View style={styles.requestMeta}>
            <Text style={styles.requestMetaText}>
              {requestData.minutes_logged} min • {formatDate(requestData.created_at)}
            </Text>
          </View>
        </View>

        {/* Responses List */}
        {responses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#E5E5E5" />
            <Text style={styles.emptyTitle}>Inga svar ännu</Text>
            <Text style={styles.emptyDescription}>
              När någon svarar på din {requestData.is_offer ? 'erbjudande' : 'förfrågan'} kommer svaren att visas här.
            </Text>
          </View>
        ) : (
          <View style={styles.responsesContainer}>
            <Text style={styles.responsesTitle}>ALLA SVAR</Text>
            {responses.map((response) => (
              <Pressable
                key={response.id}
                style={styles.responseCard}
                onPress={() => handleViewResponse(response)}
              >
                <View style={styles.responseHeader}>
                  <View style={styles.responderInfo}>
                    <View style={styles.responderAvatar}>
                      <User size={20} color="#FF69B4" />
                    </View>
                    <View style={styles.responderDetails}>
                      <Text style={styles.responderName}>
                        {response.responder.first_name} {response.responder.last_name}
                      </Text>
                      <Text style={styles.responseDate}>
                        <Clock size={12} color="#666" />
                        {' '}{formatDate(response.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.balanceIndicator}>
                    <Text style={styles.balanceText}>
                      {response.responder.minute_balance > 0 ? '+' : ''}{response.responder.minute_balance} min
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.responsePreview} numberOfLines={2}>
                  {response.message}
                </Text>
                
                <View style={styles.responseFooter}>
                  <Text style={styles.viewResponseText}>Tryck för att läsa hela meddelandet</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
  originalRequestContainer: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  originalRequestTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  originalRequestMessage: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  responsesContainer: {
    flex: 1,
  },
  responsesTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
  },
  responseCard: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  responderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  responderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responderDetails: {
    flex: 1,
  },
  responderName: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 2,
  },
  responseDate: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIndicator: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  balanceText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'Unbounded-Regular',
    fontWeight: '600',
  },
  responsePreview: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseFooter: {
    borderTopWidth: 1,
    borderTopColor: '#FFE4F1',
    paddingTop: 8,
  },
  viewResponseText: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
});