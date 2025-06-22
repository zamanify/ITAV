import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext } from 'react';
import { ArrowLeft, UserPlus, MessageCircle, UserX, Check, X, UserCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';
import GroupSelectionModal from '../../../components/GroupSelectionModal';
import VillagerMessageModal from '../../../components/VillagerMessageModal';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  status: 'connected' | 'pending' | 'request_received';
  connectionId: string;
};

type VillagerRequest = {
  id: string;
  senderName: string;
  senderPhone: string;
  memberSince: string;
  connectionId: string;
};

type SentRequest = {
  id: string;
  receiverName: string;
  receiverPhone: string;
  memberSince: string;
  connectionId: string;
};

type BlockedVillager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  blockId: string;
};

export default function VillagersScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VillagerRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [blockedVillagers, setBlockedVillagers] = useState<BlockedVillager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedVillager, setSelectedVillager] = useState<{ id: string; name: string } | null>(null);
  const [processingBlockId, setProcessingBlockId] = useState<string | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedVillagerForMessage, setSelectedVillagerForMessage] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchVillagersAndRequests();
    }
  }, [session?.user?.id]);

  const fetchVillagersAndRequests = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch villager connections with user details, excluding blocked users
      const { data: connections, error: connectionsError } = await supabase
        .from('villager_connections')
        .select(`
          id,
          status,
          created_at,
          sender:sender_id(id, first_name, last_name, phone_number, minute_balance, created_at),
          receiver:receiver_id(id, first_name, last_name, phone_number, minute_balance, created_at)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .in('status', ['pending', 'accepted', 'rejected']);

      if (connectionsError) {
        console.error('Error fetching villager connections:', connectionsError);
        setError('Kunde inte hämta dina villagers');
        return;
      }

      // Fetch blocked users (users that current user has blocked)
      const { data: blockedUsers, error: blockedError } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked:blocked_id(id, first_name, last_name, phone_number, minute_balance, created_at)
        `)
        .eq('blocker_id', session.user.id);

      if (blockedError) {
        console.error('Error fetching blocked users:', blockedError);
      }

      // Get list of blocked user IDs to filter out from connections
      const blockedUserIds = new Set((blockedUsers || []).map(block => block.blocked?.id).filter(Boolean));

      // Also get users who have blocked the current user
      const { data: blockingUsers, error: blockingError } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocked_id', session.user.id);

      if (blockingError) {
        console.error('Error fetching users who blocked current user:', blockingError);
      }

      const blockingUserIds = new Set((blockingUsers || []).map(block => block.blocker_id));

      // Filter connections to exclude blocked relationships
      const filteredConnections = (connections || []).filter(connection => {
        const otherUserId = connection.sender?.id === session.user.id 
          ? connection.receiver?.id 
          : connection.sender?.id;
        
        return otherUserId && 
               !blockedUserIds.has(otherUserId) && 
               !blockingUserIds.has(otherUserId);
      });

      // Separate different types of connections
      const acceptedConnections = filteredConnections.filter(conn => conn.status === 'accepted');
      const incomingRequests = filteredConnections.filter(conn => 
        conn.status === 'pending' && conn.receiver?.id === session.user.id
      );
      const outgoingRequests = filteredConnections.filter(conn => 
        conn.status === 'pending' && conn.sender?.id === session.user.id
      );

      // Transform accepted connections to villagers
      const villagersData: Villager[] = acceptedConnections.map(connection => {
        const otherUser = connection.sender?.id === session.user.id 
          ? connection.receiver 
          : connection.sender;

        if (!otherUser) return null;

        return {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          phoneNumber: otherUser.phone_number || '',
          memberSince: new Date(otherUser.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          balance: otherUser.minute_balance || 0,
          status: 'connected' as const,
          connectionId: connection.id
        };
      }).filter(Boolean) as Villager[];

      // Transform incoming requests
      const requestsData: VillagerRequest[] = incomingRequests.map(connection => {
        const sender = connection.sender;
        if (!sender) return null;

        return {
          id: sender.id,
          senderName: `${sender.first_name} ${sender.last_name}`,
          senderPhone: sender.phone_number || '',
          memberSince: new Date(sender.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          connectionId: connection.id
        };
      }).filter(Boolean) as VillagerRequest[];

      // Transform outgoing requests
      const sentRequestsData: SentRequest[] = outgoingRequests.map(connection => {
        const receiver = connection.receiver;
        if (!receiver) return null;

        return {
          id: receiver.id,
          receiverName: `${receiver.first_name} ${receiver.last_name}`,
          receiverPhone: receiver.phone_number || '',
          memberSince: new Date(receiver.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          connectionId: connection.id
        };
      }).filter(Boolean) as SentRequest[];

      // Transform blocked users
      const blockedData: BlockedVillager[] = (blockedUsers || []).map(block => {
        const blockedUser = block.blocked;
        if (!blockedUser) return null;

        return {
          id: blockedUser.id,
          name: `${blockedUser.first_name} ${blockedUser.last_name}`,
          phoneNumber: blockedUser.phone_number || '',
          memberSince: new Date(blockedUser.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          balance: blockedUser.minute_balance || 0,
          blockId: block.id
        };
      }).filter(Boolean) as BlockedVillager[];

      setVillagers(villagersData);
      setPendingRequests(requestsData);
      setSentRequests(sentRequestsData);
      setBlockedVillagers(blockedData);
    } catch (err) {
      console.error('Error fetching villagers:', err);
      setError('Ett fel uppstod vid hämtning av villagers');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchVillagersAndRequests();
    } catch (error) {
      console.error('Error refreshing villagers:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestResponse = async (request: VillagerRequest, accept: boolean) => {
    if (!session?.user?.id || processingRequestId === request.id) return;

    try {
      setProcessingRequestId(request.id);

      const { error } = await supabase
        .from('villager_connections')
        .update({ 
          status: accept ? 'accepted' : 'rejected' 
        })
        .eq('id', request.connectionId);

      if (error) {
        console.error('Error updating connection:', error);
        return;
      }

      // Remove the request from pending list
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));

      // If accepted, add to villagers list
      if (accept) {
        const newVillager: Villager = {
          id: request.id,
          name: request.senderName,
          phoneNumber: request.senderPhone,
          memberSince: request.memberSince,
          balance: 0, // Default balance for new connections
          status: 'connected',
          connectionId: request.connectionId
        };
        setVillagers(prev => [...prev, newVillager]);
      }
    } catch (err) {
      console.error('Error processing request:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleBlockVillager = async (villager: Villager) => {
    if (!session?.user?.id || processingBlockId === villager.id) return;

    const performBlock = async () => {
      try {
        setProcessingBlockId(villager.id);

        // Insert into user_blocks table
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: session.user.id,
            blocked_id: villager.id
          });

        if (error) {
          console.error('Error blocking villager:', error);
          const errorMessage = 'Kunde inte blockera villager. Försök igen.';
          if (Platform.OS === 'web') {
            alert(errorMessage);
          } else {
            Alert.alert('Fel', errorMessage);
          }
          return;
        }

        // Remove from villagers list and add to blocked list
        setVillagers(prev => prev.filter(v => v.id !== villager.id));
        setBlockedVillagers(prev => [...prev, {
          id: villager.id,
          name: villager.name,
          phoneNumber: villager.phoneNumber,
          memberSince: villager.memberSince,
          balance: villager.balance,
          blockId: '' // Will be set when we fetch the block ID
        }]);

        // Refresh to get the correct block ID
        fetchVillagersAndRequests();
      } catch (err) {
        console.error('Error blocking villager:', err);
        const errorMessage = 'Ett oväntat fel uppstod. Försök igen.';
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert('Fel', errorMessage);
        }
      } finally {
        setProcessingBlockId(null);
      }
    };

    // Use platform-appropriate confirmation dialog
    if (Platform.OS === 'web') {
      const confirmed = confirm(
        `Är du säker på att du vill blockera ${villager.name}? Ni kommer båda att tas bort från varandras villager-listor och kan inte lägga till varandra igen förrän du avblockerar.`
      );
      if (confirmed) {
        await performBlock();
      }
    } else {
      Alert.alert(
        'Blockera villager',
        `Är du säker på att du vill blockera ${villager.name}? Ni kommer båda att tas bort från varandras villager-listor och kan inte lägga till varandra igen förrän du avblockerar.`,
        [
          {
            text: 'Avbryt',
            style: 'cancel',
          },
          {
            text: 'Blockera',
            style: 'destructive',
            onPress: performBlock,
          },
        ]
      );
    }
  };

  const handleUnblockVillager = async (blockedVillager: BlockedVillager) => {
    if (!session?.user?.id || processingBlockId === blockedVillager.id) return;

    const performUnblock = async () => {
      try {
        setProcessingBlockId(blockedVillager.id);

        // Delete from user_blocks table
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', session.user.id)
          .eq('blocked_id', blockedVillager.id);

        if (error) {
          console.error('Error unblocking villager:', error);
          const errorMessage = 'Kunde inte avblockera villager. Försök igen.';
          if (Platform.OS === 'web') {
            alert(errorMessage);
          } else {
            Alert.alert('Fel', errorMessage);
          }
          return;
        }

        // Remove from blocked list
        setBlockedVillagers(prev => prev.filter(b => b.id !== blockedVillager.id));

        // Check if there's still a villager connection that should be restored
        const { data: connection, error: connectionError } = await supabase
          .from('villager_connections')
          .select('id, status')
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .or(`sender_id.eq.${blockedVillager.id},receiver_id.eq.${blockedVillager.id}`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!connectionError && connection) {
          // Add back to villagers list if there's an accepted connection
          setVillagers(prev => [...prev, {
            id: blockedVillager.id,
            name: blockedVillager.name,
            phoneNumber: blockedVillager.phoneNumber,
            memberSince: blockedVillager.memberSince,
            balance: blockedVillager.balance,
            status: 'connected',
            connectionId: connection.id
          }]);
        }
      } catch (err) {
        console.error('Error unblocking villager:', err);
        const errorMessage = 'Ett oväntat fel uppstod. Försök igen.';
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert('Fel', errorMessage);
        }
      } finally {
        setProcessingBlockId(null);
      }
    };

    // Use platform-appropriate confirmation dialog
    if (Platform.OS === 'web') {
      const confirmed = confirm(
        `Är du säker på att du vill avblockera ${blockedVillager.name}? Ni kommer kunna se varandra i era listor igen om ni fortfarande är anslutna som villagers.`
      );
      if (confirmed) {
        await performUnblock();
      }
    } else {
      Alert.alert(
        'Avblockera villager',
        `Är du säker på att du vill avblockera ${blockedVillager.name}? Ni kommer kunna se varandra i era listor igen om ni fortfarande är anslutna som villagers.`,
        [
          {
            text: 'Avbryt',
            style: 'cancel',
          },
          {
            text: 'Avblockera',
            onPress: performUnblock,
          },
        ]
      );
    }
  };

  const handleAddToGroup = (villager: Villager) => {
    setSelectedVillager({ id: villager.id, name: villager.name });
    setGroupModalVisible(true);
  };

  const handleCloseGroupModal = () => {
    setGroupModalVisible(false);
    setSelectedVillager(null);
  };

  const handleSendMessage = (villager: Villager) => {
    setSelectedVillagerForMessage({ id: villager.id, name: villager.name });
    setMessageModalVisible(true);
  };

  const handleCloseMessageModal = () => {
    setMessageModalVisible(false);
    setSelectedVillagerForMessage(null);
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const filteredVillagers = villagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  const filteredBlockedVillagers = blockedVillagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  const renderVillagerActions = (villager: Villager) => (
    <View style={styles.actionButtons}>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleAddToGroup(villager)}
      >
        <UserPlus size={16} color="#666" />
        <Text style={styles.actionButtonText}>LÄGG TILL{'\n'}I GRUPP</Text>
      </Pressable>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleSendMessage(villager)}
      >
        <MessageCircle size={16} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}MEDDELANDE</Text>
      </Pressable>
      <Pressable 
        style={[styles.actionButton, processingBlockId === villager.id && styles.actionButtonDisabled]}
        onPress={() => handleBlockVillager(villager)}
        disabled={processingBlockId === villager.id}
      >
        <UserX size={16} color={processingBlockId === villager.id ? "#999" : "#666"} />
        <Text style={[styles.actionButtonText, processingBlockId === villager.id && styles.actionButtonTextDisabled]}>
          {processingBlockId === villager.id ? 'BLOCKERAR...' : 'BLOCKERA'}
        </Text>
      </Pressable>
    </View>
  );

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR VILLAGERS...';
    if (error) return 'FEL VID LADDNING';
    
    const totalItems = villagers.length + pendingRequests.length + sentRequests.length + blockedVillagers.length;
    if (totalItems === 0) return 'INGA VILLAGERS ÄNNU';
    
    let title = '';
    if (villagers.length > 0) {
      title += `${villagers.length} VILLAGER${villagers.length > 1 ? 'S' : ''}`;
    }
    if (pendingRequests.length > 0) {
      if (title) title += ' • ';
      title += `${pendingRequests.length} FÖRFRÅGAN${pendingRequests.length > 1 ? 'AR' : ''}`;
    }
    if (sentRequests.length > 0) {
      if (title) title += ' • ';
      title += `${sentRequests.length} SKICKAD${sentRequests.length > 1 ? 'E' : ''}`;
    }
    if (blockedVillagers.length > 0) {
      if (title) title += ' • ';
      title += `${blockedVillagers.length} BLOCKERAD${blockedVillagers.length > 1 ? 'E' : ''}`;
    }
    
    return title.toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <Pressable
          onPress={() => router.push('/invite')}
          style={styles.headerInviteButton}
          accessibilityLabel="Bjud in villagers"
        >
          <UserPlus color="#FF69B4" size={24} />
        </Pressable>
      </View>

      {!isLoading && !error && (villagers.length > 0 || pendingRequests.length > 0 || sentRequests.length > 0 || blockedVillagers.length > 0) && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Sök bland dina villagers"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Laddar dina villagers...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchVillagersAndRequests}>
              <Text style={styles.retryButtonText}>Försök igen</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={styles.requestsSection}>
                <Text style={styles.sectionTitle}>VÄNTANDE FÖRFRÅGNINGAR</Text>
                {pendingRequests.map((request) => (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.senderName}</Text>
                      <Text style={styles.requestDetails}>
                        {request.senderPhone} | Medlem sedan {request.memberSince}
                      </Text>
                      <Text style={styles.requestText}>
                        Vill bli din villager
                      </Text>
                    </View>
                    <View style={styles.requestActions}>
                      <Pressable 
                        style={[
                          styles.requestButton, 
                          styles.acceptButton,
                          processingRequestId === request.id && styles.requestButtonDisabled
                        ]}
                        onPress={() => handleRequestResponse(request, true)}
                        disabled={processingRequestId === request.id}
                      >
                        <Check size={20} color="white" />
                        <Text style={styles.acceptButtonText}>Acceptera</Text>
                      </Pressable>
                      <Pressable 
                        style={[
                          styles.requestButton, 
                          styles.rejectButton,
                          processingRequestId === request.id && styles.requestButtonDisabled
                        ]}
                        onPress={() => handleRequestResponse(request, false)}
                        disabled={processingRequestId === request.id}
                      >
                        <X size={20} color="#FF4444" />
                        <Text style={styles.rejectButtonText}>Avvisa</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests Section */}
            {sentRequests.length > 0 && (
              <View style={styles.sentRequestsSection}>
                <Text style={styles.sectionTitle}>SKICKADE FÖRFRÅGNINGAR</Text>
                {sentRequests.map((request) => (
                  <View key={request.id} style={styles.sentRequestCard}>
                    <View style={styles.sentRequestInfo}>
                      <Text style={styles.sentRequestName}>{request.receiverName}</Text>
                      <Text style={styles.sentRequestDetails}>
                        {request.receiverPhone} | Medlem sedan {request.memberSince}
                      </Text>
                      <Text style={styles.sentRequestStatus}>
                        Väntar på svar
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Blocked Villagers Section */}
            {blockedVillagers.length > 0 && (
              <View style={styles.blockedSection}>
                <Text style={styles.sectionTitle}>BLOCKERADE VILLAGERS</Text>
                {filteredBlockedVillagers.map((blockedVillager) => (
                  <View key={blockedVillager.id} style={styles.blockedCard}>
                    <View style={styles.blockedInfo}>
                      <Text style={styles.blockedName}>{blockedVillager.name}</Text>
                      <Text style={styles.blockedDetails}>
                        {blockedVillager.phoneNumber} | Medlem sedan {blockedVillager.memberSince}
                      </Text>
                      <Text style={styles.blockedStatus}>
                        Blockerad
                      </Text>
                    </View>
                    <Pressable 
                      style={[
                        styles.unblockButton,
                        processingBlockId === blockedVillager.id && styles.unblockButtonDisabled
                      ]}
                      onPress={() => handleUnblockVillager(blockedVillager)}
                      disabled={processingBlockId === blockedVillager.id}
                    >
                      <UserCheck size={20} color={processingBlockId === blockedVillager.id ? "#999" : "#4CAF50"} />
                      <Text style={[
                        styles.unblockButtonText,
                        processingBlockId === blockedVillager.id && styles.unblockButtonTextDisabled
                      ]}>
                        {processingBlockId === blockedVillager.id ? 'Avblockerar...' : 'Avblockera'}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Villagers Section */}
            {villagers.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 && blockedVillagers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyTitle}>Inga villagers än</Text>
                <Text style={styles.emptyDescription}>
                  Du har inga anslutna villagers ännu. Börja med att bjuda in vänner eller skapa kontakter!
                </Text>
                <Pressable 
                  style={styles.inviteButton} 
                  onPress={() => router.push('/invite')}
                >
                  <Text style={styles.inviteButtonText}>Bjud in villagers</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {villagers.length > 0 && (
                  <View style={styles.villagersSection}>
                    {(pendingRequests.length > 0 || sentRequests.length > 0 || blockedVillagers.length > 0) && (
                      <Text style={styles.sectionTitle}>DINA VILLAGERS</Text>
                    )}
                    {filteredVillagers.map((villager) => (
                      <View key={villager.id} style={styles.villagerCard}>
                        <View style={styles.villagerHeader}>
                          <Text style={styles.villagerName}>{villager.name}</Text>
                        </View>
                        <View style={styles.villagerDetails}>
                          <Text style={styles.villagerPhone}>{villager.phoneNumber}</Text>
                          <Text style={styles.villagerBalance}>
                            Saldo {villager.balance > 0 ? '+' : ''}{villager.balance} min
                          </Text>
                        </View>
                        {renderVillagerActions(villager)}
                      </View>
                    ))}
                    
                    {filteredVillagers.length === 0 && searchQuery && (
                      <View style={styles.centerContainer}>
                        <Text style={styles.noResultsText}>
                          Inga villagers matchar "{searchQuery}"
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Group Selection Modal */}
      {selectedVillager && (
        <GroupSelectionModal
          visible={groupModalVisible}
          onClose={handleCloseGroupModal}
          villagerId={selectedVillager.id}
          villagerName={selectedVillager.name}
        />
      )}

      {/* Message Modal */}
      {selectedVillagerForMessage && (
        <VillagerMessageModal
          visible={messageModalVisible}
          onClose={handleCloseMessageModal}
          villager={selectedVillagerForMessage}
        />
      )}

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
  headerInviteButton: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
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
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inviteButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 15,
    marginTop: 10,
  },
  requestsSection: {
    marginBottom: 30,
  },
  sentRequestsSection: {
    marginBottom: 30,
  },
  blockedSection: {
    marginBottom: 30,
  },
  villagersSection: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: '#FFF8FC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4F1',
  },
  requestInfo: {
    marginBottom: 15,
  },
  requestName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  requestDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  requestText: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  rejectButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  sentRequestCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  sentRequestInfo: {
    flex: 1,
  },
  sentRequestName: {
    fontSize: 18,
    color: '#6C757D',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  sentRequestDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  sentRequestStatus: {
    fontSize: 14,
    color: '#FFA500',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  blockedCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedInfo: {
    flex: 1,
  },
  blockedName: {
    fontSize: 18,
    color: '#FF4444',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  blockedDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  blockedStatus: {
    fontSize: 14,
    color: '#FF4444',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  unblockButtonDisabled: {
    borderColor: '#E5E5E5',
    opacity: 0.6,
  },
  unblockButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  unblockButtonTextDisabled: {
    color: '#999',
  },
  // New improved villager card styles
  villagerCard: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FFE4F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  villagerHeader: {
    marginBottom: 8,
  },
  villagerName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
  },
  villagerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  villagerPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  villagerBalance: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Unbounded-Regular',
    lineHeight: 10,
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
});