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
  const { session } = useContext(AuthContext);

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
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Ett fel uppstod vid skickande av meddelandet');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>Laddar...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Laddar meddelanden...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Chatt'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.senderId === session?.user?.id 
                ? styles.sentMessage 
                : styles.receivedMessage
            ]}
          >
            <Text style={styles.messageText}>{message.messageText}</Text>
            <Text style={styles.messageTime}>
              {formatTime(message.createdAt)}
            </Text>
            {message.viaGroupName && (
              <Text style={styles.groupName}>via {message.viaGroupName}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Skriv ett meddelande..."
          multiline
          maxLength={500}
        />
        <Pressable 
          onPress={sendMessage}
          style={[
            styles.sendButton,
            (!newMessage.trim() || isSending) && styles.sendButtonDisabled
          ]}
          disabled={!newMessage.trim() || isSending}
        >
          <Send size={20} color={(!newMessage.trim() || isSending) ? '#ccc' : '#007AFF'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Unbounded-SemiBold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontFamily: 'Unbounded-Regular',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    color: '#666',
    marginTop: 4,
  },
  groupName: {
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});