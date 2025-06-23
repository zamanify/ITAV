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
  };
  }, [session?.user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchConversations();
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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