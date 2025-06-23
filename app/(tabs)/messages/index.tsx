import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext, useCallback } from 'react';
import { ArrowLeft, MessageCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';

SplashScreen.preventAutoHideAsync();

type Conversation = {
  partnerId: string;
  partnerName: string;
  latestMessage: string;
  latestMessageTime: string;
  isLatestFromMe: boolean;
  unreadCount: number;
  viaGroupName?: string;
};

export default function MessagesScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_conversation_list', {
        user_id: session.user.id
      });

      if (fetchError) {
        console.error('Error fetching conversations:', fetchError);
        setError('Kunde inte hämta meddelanden');
        return;
      }

      const conversationsData: Conversation[] = (data || []).map((conv: any) => ({
        partnerId: conv.partner_id,
        partnerName: conv.partner_name,
        latestMessage: conv.latest_message,
        latestMessageTime: formatMessageTime(conv.latest_message_time),
        isLatestFromMe: conv.is_latest_from_me,
        unreadCount: parseInt(conv.unread_count) || 0,
        viaGroupName: conv.via_group_name
      }));

      setConversations(conversationsData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Ett fel uppstod vid hämtning av meddelanden');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Use useFocusEffect to handle real-time subscriptions properly
  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return;

      // Fetch conversations when screen comes into focus
      fetchConversations();

      // Use a static channel name based on the user's ID for consistent subscription
      const channel = supabase
        .channel(`user-messages-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` },
          fetchConversations
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${session.user.id}` },
          fetchConversations
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` },
          fetchConversations
        )
        .subscribe();

      // Cleanup function - this will run when the screen loses focus or unmounts
      return () => {
        supabase.removeChannel(channel);
      };
    }, [session?.user?.id, fetchConversations])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchConversations();
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchConversations]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('sv-SE', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleConversationPress = (partnerId: string) => {
    router.push(`/messages/${partnerId}`);
  };

  if (!fontsLoaded) {
    return null;
  }

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR MEDDELANDEN...';
    if (error) return 'FEL VID LADDNING';
    if (conversations.length === 0) return 'INGA MEDDELANDEN ÄNNU';
    if (conversations.length === 1) return '1 KONVERSATION';
    return `${conversations.length} KONVERSATIONER`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Laddar dina meddelanden...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchConversations}>
              <Text style={styles.retryButtonText}>Försök igen</Text>
            </Pressable>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.centerContainer}>
            <MessageCircle size={48} color="#E5E5E5" />
            <Text style={styles.emptyTitle}>Inga meddelanden än</Text>
            <Text style={styles.emptyDescription}>
              När du skickar eller tar emot meddelanden kommer de att visas här.
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <Pressable
              key={conversation.partnerId}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conversation.partnerId)}
            >
              <View style={styles.conversationHeader}>
                <View style={styles.conversationInfo}>
                  <Text style={styles.partnerName}>{conversation.partnerName}</Text>
                  {conversation.viaGroupName && (
                    <Text style={styles.viaGroupText}>Via {conversation.viaGroupName}</Text>
                  )}
                </View>
                <View style={styles.conversationMeta}>
                  <Text style={styles.messageTime}>
                    <Clock size={12} color="#666" />
                    {' '}{conversation.latestMessageTime}
                  </Text>
                  {conversation.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <Text 
                style={[
                  styles.latestMessage,
                  conversation.unreadCount > 0 && styles.unreadMessage
                ]} 
                numberOfLines={2}
              >
                {conversation.isLatestFromMe ? 'Du: ' : ''}{conversation.latestMessage}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <AppFooter />
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
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 120, // Space for footer
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
  conversationCard: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conversationInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 2,
  },
  viaGroupText: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Unbounded-SemiBold',
  },
  latestMessage: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
});