import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext } from 'react';
import { ArrowLeft, UserPlus, MessageCircle, UserX, Check, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';
import GroupSelectionModal from '../../../components/GroupSelectionModal';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  status: 'connected' | 'pending' | 'request_received' | 'blocked';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedVillager, setSelectedVillager] = useState<{ id: string; name: string } | null>(null);

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

      // Fetch villager connections with user details
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
        .neq('status', 'deleted'); // Exclude deleted connections

      if (connectionsError) {
        console.error('Error fetching villager connections:', connectionsError);
        setError('Kunde inte hämta dina villagers');
        return;
      }

      // Separate different types of connections
      const acceptedConnections = (connections || []).filter(conn => conn.status === 'accepted');
      const incomingRequests = (connections || []).filter(conn => 
        conn.status === 'pending' && conn.receiver?.id === session.user.id
      );
      const outgoingRequests = (connections || []).filter(conn => 
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

      setVillagers(villagersData);
      setPendingRequests(requestsData);
      setSentRequests(sentRequestsData);
    } catch (err) {
      console.error('Error fetching villagers:', err);
      setError('Ett fel uppstod vid hämtning av villagers');
    } finally {
      setIsLoading(false);
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

  const handleRemoveVillager = async (villager: Villager) => {
    Alert.alert(
      'Ta bort villager',
      `Är du säker på att du vill ta bort ${villager.name} som villager? Detta kan inte ångras.`,
      [
        {
          text: 'Avbryt',
          style: 'cancel',
        },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update connection status to 'deleted' instead of removing
              const { error } = await supabase
                .from('villager_connections')
                .update({ status: 'deleted' })
                .eq('id', villager.connectionId);

              if (error) {
                console.error('Error removing villager:', error);
                Alert.alert('Fel', 'Kunde inte ta bort villager. Försök igen.');
                return;
              }

              // Remove from local state
              setVillagers(prev => prev.filter(v => v.id !== villager.id));
            } catch (err) {
              console.error('Error removing villager:', err);
              Alert.alert('Fel', 'Ett oväntat fel uppstod. Försök igen.');
            }
          },
        },
      ]
    );
  };

  const handleAddToGroup = (villager: Villager) => {
    setSelectedVillager({ id: villager.id, name: villager.name });
    setGroupModalVisible(true);
  };

  const handleCloseGroupModal = () => {
    setGroupModalVisible(false);
    setSelectedVillager(null);
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

  const renderVillagerActions = (villager: Villager) => (
    <View style={styles.actionButtons}>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleAddToGroup(villager)}
      >
        <UserPlus size={24} color="#666" />
        <Text style={styles.actionButtonText}>LÄGG TILL{'\n'}I GRUPP</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <MessageCircle size={24} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}MEDDELANDE</Text>
      </Pressable>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleRemoveVillager(villager)}
      >
        <UserX size={24} color="#666" />
        <Text style={styles.actionButtonText}>BLOCKERA{'\n'}OCH RADERA</Text>
      </Pressable>
    </View>
  );

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR VILLAGERS...';
    if (error) return 'FEL VID LADDNING';
    
    const totalItems = villagers.length + pendingRequests.length + sentRequests.length;
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
    
    return title.toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      {!isLoading && !error && (villagers.length > 0 || pendingRequests.length > 0 || sentRequests.length > 0) && (
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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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

            {/* Villagers Section */}
            {villagers.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 ? (
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
                    {(pendingRequests.length > 0 || sentRequests.length > 0) && (
                      <Text style={styles.sectionTitle}>DINA VILLAGERS</Text>
                    )}
                    {filteredVillagers.map((villager) => (
                      <View key={villager.id} style={styles.villagerCard}>
                        <View style={styles.villagerInfo}>
                          <Text style={styles.villagerName}>{villager.name}</Text>
                          <Text style={styles.villagerDetails}>
                            {villager.phoneNumber} | Medlem sedan {villager.memberSince}
                          </Text>
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
  villagerCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  villagerInfo: {
    marginBottom: 20,
  },
  villagerName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  villagerDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  villagerBalance: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Unbounded-Regular',
  },
});