import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
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
  viaRequestTitle?: string;
  viaIsOffer?: boolean;
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

  const { session } = useContext(AuthContext);
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

  const fetchMessages = async () => {
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
          via_group:via_group_id(name),
          via_request_title,
          via_is_offer
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
        viaGroupName: msg.via_group?.name,
        viaRequestTitle: msg.via_request_title,
        viaIsOffer: msg.via_is_offer
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
  };

  const markMessagesAsRead = async () => {
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
  };

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
          via_group_id: null // Direct message, not via group
        });

      if (error) {
        console.error('Error sending message:', error);
        setError('Kunde inte skicka meddelandet');
        return;
      }

      setNewMessage('');
      await fetchMessages(); // Refresh messages to show the new one
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Ett fel uppstod vid skickande av meddelande');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBack = () => {
    router.back();
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#FF69B4" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Laddar...</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Laddar meddelanden...</Text>
        </View>
      </View>
    );
  }

  if (error || !userInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#FF69B4" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Fel</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Kunde inte ladda chat'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </Pressable>
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
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {userInfo.firstName} {userInfo.lastName}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Inga meddelanden än. Skriv det första meddelandet!
            </Text>
          </View>
        ) : (
          messages.map((message) => {
            const isFromMe = message.senderId === session?.user?.id;
            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  isFromMe ? styles.myMessage : styles.theirMessage
                ]}
              >
                <Text style={[
                  styles.messageText,
                  isFromMe ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {message.messageText}
                </Text>
                {message.viaGroupName && (
                  <Text style={[
                    styles.viaGroupText,
                    isFromMe ? styles.myViaGroupText : styles.theirViaGroupText
                  ]}>
                    Via {message.viaGroupName}
                  </Text>
                )}
                {message.viaRequestTitle && (
                  <Text style={[
                    styles.viaGroupText,
                    isFromMe ? styles.myViaGroupText : styles.theirViaGroupText
                  ]}>
                    Via {message.viaIsOffer ? 'erbjudande' : 'förfrågan'}: {message.viaRequestTitle}
                  </Text>
                )}
                <Text style={[
                  styles.messageTime,
                  isFromMe ? styles.myMessageTime : styles.theirMessageTime
                ]}>
                  {formatMessageTime(message.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Skriv ett meddelande..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!newMessage.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || isSending}
        >
          <Send size={20} color={(!newMessage.trim() || isSending) ? "#999" : "white"} />
        </Pressable>
      </View>
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
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF69B4',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#333',
  },
  viaGroupText: {
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
    marginTop: 4,
  },
  myViaGroupText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  theirViaGroupText: {
    color: '#87CEEB',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Unbounded-Regular',
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#FF69B4',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
});