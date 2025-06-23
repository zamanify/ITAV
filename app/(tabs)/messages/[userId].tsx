import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { realtimeManager } from '@/lib/realtimeManager';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
  viaGroupName?: string;
};

type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChatScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id && userId) {
      fetchUserInfo();
      fetchMessages();
      markMessagesAsRead();
    }
  }, [session?.user?.id, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id || !userId) return;

      const unsubscribe = realtimeManager.subscribeToMessages(
        session.user.id,
        userId,
        () => {
          fetchMessages();
          markMessagesAsRead();
        }
      );

      return () => {
        unsubscribe();
      };
    }, [session?.user?.id, userId, fetchMessages, markMessagesAsRead])
  );

  const fetchUserInfo = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user info:', error);
        setError('Kunde inte hämta användarinformation');
        return;
      }

      setUserInfo({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name
      });
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Ett fel uppstod vid hämtning av användarinformation');
    }
  };


  const fetchMessages = useCallback(async () => {
    if (!session?.user?.id || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          message_text,
          is_read,
          created_at,
          via_group:via_group_id(name)
        `)
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setError('Kunde inte hämta meddelanden');
        return;
      }

      const messagesData: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        messageText: msg.message_text,
        isRead: msg.is_read,
        createdAt: msg.created_at,
        viaGroupName: msg.via_group?.name
      }));

      setMessages(messagesData);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Ett fel uppstod vid hämtning av meddelanden');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, userId]);
  
  const markMessagesAsRead = useCallback(async () => {
    if (!session?.user?.id || !userId) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [session?.user?.id, userId]);

  const sendMessage = async () => {
    if (!session?.user?.id || !userId || !newMessage.trim() || isSending) return;

    try {
      setIsSending(true);

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: session.user.id,
          receiver_id: userId,
          message_text: newMessage.trim(),
          via_group_id: null
        });

      if (error) {
        console.error('Error sending message:', error);
        setError('Kunde inte skicka meddelandet');
        return;
      }

      setNewMessage('');
      await fetchMessages(); // Refresh messages to show the new one
    } catch (err) {