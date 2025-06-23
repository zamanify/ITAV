import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, MessageCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { realtimeManager } from '@/lib/realtimeManager';
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

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    }
  }, [session?.user?.id]);

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

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return;

      const unsubscribe = realtimeManager.subscribeToConversations(
        session.user.id,
        fetchConversations
      );

      return () => {
        unsubscribe();
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

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meddelanden</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Laddar meddelanden...</Text>
        </View>
        <AppFooter />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meddelanden</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchConversations}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
        </View>
        <AppFooter />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meddelanden</Text>
      </View>

      <ScrollView 
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Inga meddelanden än</Text>
            <Text style={styles.emptySubtitle}>
              Dina konversationer kommer att visas här
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <Pressable
              key={conversation.partnerId}
              style={styles.conversationItem}
              onPress={() => router.push(`/messages/${conversation.partnerId}`)}
            >
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.partnerName}>
                    {conversation.partnerName}
                  </Text>
                  <View style={styles.timeAndBadge}>
                    <Text style={styles.messageTime}>
                      {conversation.latestMessageTime}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>
                          {conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {conversation.viaGroupName && (
                  <Text style={styles.groupName}>
                    via {conversation.viaGroupName}
                  </Text>
                )}
                
                <Text 
                  style={[
                    styles.latestMessage,
                    conversation.unreadCount > 0 && styles.unreadMessage
                  ]}
                  numberOfLines={2}
                >
                  {conversation.isLatestFromMe ? 'Du: ' : ''}
                  {conversation.latestMessage}
                </Text>
              </View>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Unbounded-SemiBold',
    color: '#111827',
    textAlign: 'center',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
    color: '#111827',
    flex: 1,
  },
  timeAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Unbounded-Regular',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Unbounded-SemiBold',
  },
  groupName: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  latestMessage: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#374151',
    fontFamily: 'Unbounded-SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Unbounded-SemiBold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
});