import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, User, Check, MessageCircle } from 'lucide-react-native';
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
  request: {
    id: string;
    message: string;
    is_offer: boolean;
    time_slot: string | null;
    flexible: boolean;
    minutes_logged: number;
    status: string;
    created_at: string;
  };
};

export default function ViewResponseScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const responseId = params.responseId as string;
  const requestId = params.requestId as string;
  const responderId = params.responderId as string;

  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id && responseId) {
      fetchResponseData();
    }
  }, [session?.user?.id, responseId]);

  const fetchResponseData = async () => {
    if (!responseId || !session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
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
          ),
          request:request_id(
            id,
            message,
            is_offer,
            time_slot,
            flexible,
            minutes_logged,
            status,
            created_at,
            requester_id
          )
        `)
        .eq('id', responseId)
        .single();

      if (fetchError) {
        console.error('Error fetching response data:', fetchError);
        setError('Kunde inte hämta svaret');
        return;
      }

      // Verify that the current user owns the request
      if (data.request.requester_id !== session.user.id) {
        setError('Du har inte behörighet att se detta svar');
        return;
      }

      setResponseData(data);
    } catch (err) {
      console.error('Error fetching response data:', err);
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

  const handleSelectResponder = async () => {
    if (!responseData || !session?.user?.id || isSelecting) return;

    const performSelection = async () => {
      try {
        setIsSelecting(true);

        // Update the request status to 'accepted' and mark it as completed
        const { error: updateError } = await supabase
          .from('requests')
          .update({ 
            status: 'accepted'
          })
          .eq('id', requestId)
          .eq('requester_id', session.user.id);

        if (updateError) {
          console.error('Error updating request status:', updateError);
          setError('Kunde inte välja denna person. Försök igen.');
          return;
        }

        // Navigate back to the main dashboard or responses list
        router.push('/(tabs)');
      } catch (err) {
        console.error('Error selecting responder:', err);
        setError('Ett fel uppstod vid val av person');
      } finally {
        setIsSelecting(false);
      }
    };

    // Use platform-appropriate confirmation dialog
    const responderName = `${responseData.responder.first_name} ${responseData.responder.last_name}`;
    const confirmMessage = `Är du säker på att du vill välja ${responderName} för denna ${responseData.request.is_offer ? 'erbjudande' : 'förfrågan'}?`;

    if (Platform.OS === 'web') {
      const confirmed = confirm(confirmMessage);
      if (confirmed) {
        await performSelection();
      }
    } else {
      Alert.alert(
        'Bekräfta val',
        confirmMessage,
        [
          {
            text: 'Avbryt',
            style: 'cancel',
          },
          {
            text: 'Välj',
            onPress: performSelection,
          },
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

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getBalanceText = () => {
    if (!responseData) return '';
    
    const balance = responseData.responder.minute_balance;
    if (balance === 0) return 'NI HAR 0 MIN MELLAN ER';
    if (balance > 0) return `${responseData.responder.first_name} ÄR SKYLDIG DIG ${balance} MIN`;
    return `DU ÄR SKYLDIG ${responseData.responder.first_name} ${Math.abs(balance)} MIN`;
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

  if (error || !responseData) {
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
          <Pressable style={styles.retryButton} onPress={fetchResponseData}>
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
        <Text style={styles.headerTitle}>
          SVAR FRÅN {responseData.responder.first_name.toUpperCase()}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Responder Profile */}
        <View style={styles.responderContainer}>
          <View style={styles.responderHeader}>
            <View style={styles.responderAvatar}>
              <User size={32} color="#FF69B4" />
            </View>
            <View style={styles.responderInfo}>
              <Text style={styles.responderName}>
                {responseData.responder.first_name} {responseData.responder.last_name}
              </Text>
              <Text style={styles.responderPhone}>
                {responseData.responder.phone_number}
              </Text>
              <Text style={styles.memberSince}>
                Medlem sedan {formatMemberSince(responseData.responder.created_at)}
              </Text>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>SALDO</Text>
              <Text style={styles.balanceValue}>
                {responseData.responder.minute_balance > 0 ? '+' : ''}{responseData.responder.minute_balance} min
              </Text>
            </View>
          </View>
          
          <Text style={styles.balanceText}>{getBalanceText()}</Text>
        </View>

        {/* Response Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>MEDDELANDE</Text>
          <Text style={styles.messageText}>{responseData.message}</Text>
          <Text style={styles.messageDate}>
            Skickat {formatDate(responseData.created_at)}
          </Text>
        </View>

        {/* Original Request Summary */}
        <View style={styles.originalRequestContainer}>
          <Text style={styles.originalRequestTitle}>
            DIN URSPRUNGLIGA {responseData.request.is_offer ? 'ERBJUDANDE' : 'FÖRFRÅGAN'}
          </Text>
          <Text style={styles.originalRequestMessage}>
            {responseData.request.message}
          </Text>
          <Text style={styles.originalRequestMeta}>
            {responseData.request.minutes_logged} min • {formatDate(responseData.request.created_at)}
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Pressable 
          style={[styles.selectButton, isSelecting && styles.selectButtonDisabled]}
          onPress={handleSelectResponder}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.selectButtonText}>Väljer...</Text>
            </>
          ) : (
            <>
              <Check size={20} color="white" />
              <Text style={styles.selectButtonText}>
                Välj {responseData.responder.first_name}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.messageButton}>
          <MessageCircle size={20} color="#FF69B4" />
          <Text style={styles.messageButtonText}>Skicka meddelande</Text>
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
    paddingBottom: 120,
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
  responderContainer: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  responderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  responderInfo: {
    flex: 1,
  },
  responderName: {
    fontSize: 20,
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
  memberSince: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
  },
  balanceText: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 24,
    marginBottom: 12,
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  originalRequestContainer: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  originalRequestTitle: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  originalRequestMessage: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  originalRequestMeta: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  spacer: {
    height: 20,
  },
  actionContainer: {
    padding: 20,
    gap: 12,
  },
  selectButton: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  selectButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  messageButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  messageButtonText: {
    color: '#FF69B4',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});