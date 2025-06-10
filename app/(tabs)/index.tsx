import { View, Text, StyleSheet, Pressable, Image, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { useEffect, useState, useContext } from 'react';
import { Plus, MessageCircle, Eye, Users, CircleCheck as CheckCircle } from 'lucide-react-native';
import RequestOfferModal from '../../components/RequestOfferModal';
import AppFooter from '../../components/AppFooter';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type RequestItem = {
  id: string;
  type: 'request' | 'offer';
  message: string;
  date: string;
  time: string;
  views: number;
  responses: number;
  status: string;
  estimatedTime: number;
  flexible: boolean;
  timeSlot?: string;
  completedDate?: string;
  responderName?: string;
};

type ReceivedItem = {
  id: string;
  type: 'request' | 'offer';
  senderName: string;
  message: string;
  date: string;
  time: string;
  urgency: string;
  estimatedTime: number;
  balance: number;
  groupName?: string;
  senderId: string;
};

type UserStats = {
  minuteBalance: number;
  villagersCount: number;
  hoodsCount: number;
};

export default function Dashboard() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [selectedRequest, setSelectedRequest] = useState<ReceivedItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    minuteBalance: 0,
    villagersCount: 0,
    hoodsCount: 0,
  });
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [myOffers, setMyOffers] = useState<RequestItem[]>([]);
  const [completedRequests, setCompletedRequests] = useState<RequestItem[]>([]);
  const [completedOffers, setCompletedOffers] = useState<RequestItem[]>([]);
  const [othersRequests, setOthersRequests] = useState<ReceivedItem[]>([]);
  const [othersOffers, setOthersOffers] = useState<ReceivedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
    }
  }, [session?.user?.id]);

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

      // Fetch user's minute balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('minute_balance')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      // Count villager connections (accepted connections where user is sender or receiver)
      // Exclude blocked relationships
      const { data: connections, error: connectionsError } = await supabase
        .from('villager_connections')
        .select(`
          id,
          sender_id,
          receiver_id
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);

      if (connectionsError) {
        console.error('Error fetching villagers connections:', connectionsError);
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

      // Filter out blocked connections
      const nonBlockedConnections = (connections || []).filter(connection => {
        const otherUserId = connection.sender_id === session.user.id 
          ? connection.receiver_id 
          : connection.sender_id;
        
        return !blockedByMe.has(otherUserId) && !blockedByThem.has(otherUserId);
      });

      const villagersCount = nonBlockedConnections.length;

      // Count groups where user is a member
      const { count: hoodsCount, error: hoodsError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (hoodsError) {
        console.error('Error fetching hoods count:', hoodsError);
      }

      // Fetch my requests and offers (including completed ones)
      const { data: myRequestsData, error: myRequestsError } = await supabase
        .from('requests')
        .select(`
          id,
          message,
          is_offer,
          status,
          time_slot,
          flexible,
          minutes_logged,
          created_at,
          accepted_responder:accepted_responder_id(
            first_name,
            last_name
          )
        `)
        .eq('requester_id', session.user.id)
        .order('created_at', { ascending: false });

      if (myRequestsError) {
        console.error('Error fetching my requests:', myRequestsError);
      }

      // Get response counts for my requests/offers
      const myRequestIds = (myRequestsData || []).map(req => req.id);
      let responseCountMap: Record<string, number> = {};
      
      if (myRequestIds.length > 0) {
        const { data: responseCounts, error: responseError } = await supabase
          .from('request_responses')
          .select('request_id')
          .in('request_id', myRequestIds);

        if (responseError) {
          console.error('Error fetching response counts:', responseError);
        } else {
          // Count responses per request
          responseCountMap = (responseCounts || []).reduce((acc, response) => {
            acc[response.request_id] = (acc[response.request_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Process my requests and offers
      const processedMyRequests: RequestItem[] = [];
      const processedMyOffers: RequestItem[] = [];
      const processedCompletedRequests: RequestItem[] = [];
      const processedCompletedOffers: RequestItem[] = [];

      (myRequestsData || []).forEach(item => {
        const createdAt = new Date(item.created_at);
        const responderName = item.accepted_responder 
          ? `${item.accepted_responder.first_name} ${item.accepted_responder.last_name}`
          : undefined;

        const processedItem: RequestItem = {
          id: item.id,
          type: item.is_offer ? 'offer' : 'request',
          message: item.message,
          date: createdAt.toLocaleDateString('sv-SE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          }).toUpperCase(),
          time: createdAt.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          views: Math.floor(Math.random() * 20) + 1, // Mock data for now
          responses: responseCountMap[item.id] || 0,
          status: item.status,
          estimatedTime: item.minutes_logged || 0,
          flexible: item.flexible,
          timeSlot: item.time_slot,
          responderName: responderName
        };

        if (item.status === 'completed') {
          // Add to completed section
          if (item.is_offer) {
            processedCompletedOffers.push(processedItem);
          } else {
            processedCompletedRequests.push(processedItem);
          }
        } else {
          // Add to active section
          if (item.is_offer) {
            processedMyOffers.push(processedItem);
          } else {
            processedMyRequests.push(processedItem);
          }
        }
      });

      // Fetch others' requests and offers from BOTH groups AND direct villager requests
      
      // 1. Get group memberships
      const { data: groupMemberships, error: groupError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.user.id);

      if (groupError) {
        console.error('Error fetching group memberships:', groupError);
      }

      const groupIds = (groupMemberships || []).map(gm => gm.group_id);

      // 2. Fetch requests through groups
      let groupRequestsData: any[] = [];
      if (groupIds.length > 0) {
        const { data, error: groupRequestsError } = await supabase
          .from('requests')
          .select(`
            id,
            requester_id,
            message,
            is_offer,
            status,
            time_slot,
            flexible,
            minutes_logged,
            created_at,
            requester:requester_id(first_name, last_name, minute_balance),
            request_groups!inner(
              group:group_id(name)
            )
          `)
          .in('request_groups.group_id', groupIds)
          .neq('requester_id', session.user.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (groupRequestsError) {
          console.error('Error fetching group requests:', groupRequestsError);
        } else {
          groupRequestsData = data || [];
        }
      }

      // 3. Fetch requests through direct villager connections
      const { data: villagerRequestsData, error: villagerRequestsError } = await supabase
        .from('requests')
        .select(`
          id,
          requester_id,
          message,
          is_offer,
          status,
          time_slot,
          flexible,
          minutes_logged,
          created_at,
          requester:requester_id(first_name, last_name, minute_balance),
          request_villagers!inner(
            user_id
          )
        `)
        .eq('request_villagers.user_id', session.user.id)
        .neq('requester_id', session.user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (villagerRequestsError) {
        console.error('Error fetching villager requests:', villagerRequestsError);
      }

      // 4. Combine and deduplicate requests from both sources
      const allOthersRequests = [...groupRequestsData];
      
      // Add villager requests that aren't already in group requests
      (villagerRequestsData || []).forEach(villagerRequest => {
        const alreadyExists = allOthersRequests.some(groupRequest => 
          groupRequest.id === villagerRequest.id
        );
        if (!alreadyExists) {
          allOthersRequests.push(villagerRequest);
        }
      });

      // 5. Filter out requests from blocked users
      const filteredOthersRequests = allOthersRequests.filter(request => {
        const requesterId = request.requester_id;
        return !blockedByMe.has(requesterId) && !blockedByThem.has(requesterId);
      });

      // Process others' requests and offers
      const processedOthersRequests: ReceivedItem[] = [];
      const processedOthersOffers: ReceivedItem[] = [];

      filteredOthersRequests.forEach(item => {
        if (!item.requester) return;

        const createdAt = new Date(item.created_at);
        const senderName = `${item.requester.first_name} ${item.requester.last_name}`;
        
        // Get group name if this request came from groups
        const groupName = item.request_groups?.[0]?.group?.name;
        
        const processedItem: ReceivedItem = {
          id: item.id,
          type: item.is_offer ? 'offer' : 'request',
          senderName: senderName.toUpperCase(),
          message: item.message,
          date: createdAt.toLocaleDateString('sv-SE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          }).toUpperCase(),
          time: createdAt.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          urgency: 'NORMAL', // Mock data for now
          estimatedTime: item.minutes_logged || 0,
          balance: item.requester.minute_balance || 0,
          groupName: groupName,
          senderId: item.requester_id
        };

        if (item.is_offer) {
          processedOthersOffers.push(processedItem);
        } else {
          processedOthersRequests.push(processedItem);
        }
      });

      // Sort by creation date (most recent first)
      processedOthersRequests.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
      processedOthersOffers.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());

      setUserStats({
        minuteBalance: userData?.minute_balance || 0,
        villagersCount: villagersCount || 0,
        hoodsCount: hoodsCount || 0,
      });

      setMyRequests(processedMyRequests);
      setMyOffers(processedMyOffers);
      setCompletedRequests(processedCompletedRequests);
      setCompletedOffers(processedCompletedOffers);
      setOthersRequests(processedOthersRequests);
      setOthersOffers(processedOthersOffers);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleNavigateToCreateRequest = () => {
    router.push('/create-request');
  };

  const handleNavigateToCreateOffer = () => {
    router.push('/create-offer');
  };

  const handleOpenModal = (item: ReceivedItem) => {
    setSelectedRequest(item);
    setModalVisible(true);
  };

  const handleSeeResponses = (requestId: string, status: string) => {
    if (status === 'accepted') {
      router.push({
        pathname: '/manage-request',
        params: { requestId }
      });
    } else {
      router.push({
        pathname: '/see-responses',
        params: { requestId }
      });
    }
  };

  const formatMinuteBalance = (balance: number) => {
    if (balance === 0) return '0 min';
    return `${balance > 0 ? '+' : ''}${balance} min`;
  };

  const renderMyRequestItem = (item: RequestItem) => (
    <View key={item.id} style={styles.myRequestContainer}>
      <View style={styles.myRequestHeader}>
        <Text style={styles.myRequestTitle}>
          {item.type === 'request' ? 'DIN FÖRFRÅGAN' : 'DITT ERBJUDANDE'}
        </Text>
        <Text style={styles.myRequestDate}>
          {item.date}, {item.time}
        </Text>
      </View>
      <Text style={styles.myRequestMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.myRequestStats}>
        <View style={styles.statsGroup}>
          <View style={styles.statRow}>
            <Eye size={14} color="#FF69B4" />
            <Text style={styles.statsValue}>{item.views}</Text>
          </View>
          <Text style={styles.statsLabel}>VISNINGAR</Text>
        </View>
        <View style={styles.statsGroup}>
          <View style={styles.statRow}>
            <MessageCircle size={14} color="#FF69B4" />
            <Text style={styles.statsValue}>{item.responses}</Text>
          </View>
          <Text style={styles.statsLabel}>SVAR</Text>
        </View>
        <Pressable 
          style={styles.seeAnswersButton}
          onPress={() => handleSeeResponses(item.id, item.status)}
        >
          <Text style={styles.seeAnswersButtonText}>
            {item.status === 'accepted' ? 'Hantera ärende' : 'Se svar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMyOfferItem = (item: RequestItem) => (
    <LinearGradient
      key={item.id}
      colors={['#87CEEB', '#9370DB']}
      style={styles.myOfferContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.myOfferHeader}>
        <Text style={styles.myOfferTitle}>DITT ERBJUDANDE</Text>
        <Text style={styles.myOfferDate}>
          {item.date}, {item.time}
        </Text>
      </View>
      <Text style={styles.myOfferMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.myOfferStats}>
        <View style={styles.offerStatsGroup}>
          <View style={styles.statRow}>
            <Eye size={14} color="white" />
            <Text style={styles.offerStatsValue}>{item.views}</Text>
          </View>
          <Text style={styles.offerStatsLabel}>VISNINGAR</Text>
        </View>
        <View style={styles.offerStatsGroup}>
          <View style={styles.statRow}>
            <MessageCircle size={14} color="white" />
            <Text style={styles.offerStatsValue}>{item.responses}</Text>
          </View>
          <Text style={styles.offerStatsLabel}>SVAR</Text>
        </View>
        <Pressable 
          style={styles.seeOfferAnswersButton}
          onPress={() => handleSeeResponses(item.id, item.status)}
        >
          <Text style={styles.seeOfferAnswersButtonText}>
            {item.status === 'accepted' ? 'Hantera ärende' : 'Se svar'}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );

  const renderCompletedItem = (item: RequestItem, isOffer: boolean = false) => (
    <View key={item.id} style={isOffer ? styles.completedOfferContainer : styles.completedRequestContainer}>
      <View style={styles.completedHeader}>
        <View style={styles.completedTitleRow}>
          <CheckCircle size={16} color={isOffer ? "#87CEEB" : "#FF69B4"} />
          <Text style={isOffer ? styles.completedOfferTitle : styles.completedRequestTitle}>
            KLART {item.type === 'request' ? 'FÖRFRÅGAN' : 'ERBJUDANDE'}
          </Text>
        </View>
        <Text style={isOffer ? styles.completedOfferDate : styles.completedRequestDate}>
          {item.date}, {item.time}
        </Text>
      </View>
      <Text style={isOffer ? styles.completedOfferMessage : styles.completedRequestMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.completedDetails}>
        <Text style={isOffer ? styles.completedOfferDetail : styles.completedRequestDetail}>
          {item.estimatedTime} min • {item.responderName ? `Med ${item.responderName}` : 'Genomfört'}
        </Text>
      </View>
    </View>
  );

  const renderOthersItem = (item: ReceivedItem, isOffer: boolean = false) => (
    <View key={item.id} style={isOffer ? styles.othersOfferContainer : styles.othersRequestContainer}>
      <View style={styles.othersItemHeader}>
        <Text style={isOffer ? styles.othersOfferSender : styles.othersRequestSender}>
          {item.senderName}S {item.type === 'request' ? 'FÖRFRÅGAN' : 'ERBJUDANDE'}
        </Text>
        <Text style={isOffer ? styles.othersOfferDate : styles.othersRequestDate}>
          {item.date}, {item.time}
        </Text>
      </View>
      <View style={styles.othersItemContent}>
        <Text style={isOffer ? styles.othersOfferMessage : styles.othersRequestMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Pressable 
          style={isOffer ? styles.seeOfferQuestionButton : styles.seeQuestionButton}
          onPress={() => handleOpenModal(item)}
        >
          <Text style={isOffer ? styles.seeOfferQuestionButtonText : styles.seeQuestionButtonText}>
            Se {item.type === 'request' ? 'fråga' : 'erbjudande'}
          </Text>
        </Pressable>
      </View>
      {item.groupName && (
        <View style={styles.groupBadge}>
          <Users size={12} color={isOffer ? "#87CEEB" : "#FF69B4"} />
          <Text style={isOffer ? styles.groupBadgeTextOffer : styles.groupBadgeText}>
            {item.groupName}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Card */}
        <LinearGradient
          colors={['#FF69B4', '#9370DB', '#87CEEB']}
          style={styles.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {isLoading ? '...' : formatMinuteBalance(userStats.minuteBalance)}
              </Text>
              <Text style={styles.statLabel}>Saldo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {isLoading ? '...' : userStats.villagersCount}
              </Text>
              <Text style={styles.statLabel}>Villagers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {isLoading ? '...' : userStats.hoodsCount}
              </Text>
              <Text style={styles.statLabel}>Hoods</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable 
              style={[styles.actionButton, styles.requestButton]}
              onPress={handleNavigateToCreateRequest}
            >
              <Text style={styles.actionButtonText}>Ny förfrågan</Text>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, styles.offerButton]}
              onPress={handleNavigateToCreateOffer}
            >
              <Plus size={16} color="white" strokeWidth={2.5} />
              <Text style={styles.actionButtonText}>Nytt erbjudande</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* My Requests */}
          {myRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MINA FÖRFRÅGNINGAR</Text>
              {myRequests.map(renderMyRequestItem)}
            </View>
          )}

          {/* My Offers */}
          {myOffers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MINA ERBJUDANDEN</Text>
              {myOffers.map(renderMyOfferItem)}
            </View>
          )}

          {/* Others' Requests */}
          {othersRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ANDRAS FÖRFRÅGNINGAR</Text>
              {othersRequests.map(item => renderOthersItem(item, false))}
            </View>
          )}

          {/* Others' Offers */}
          {othersOffers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ANDRAS ERBJUDANDEN</Text>
              {othersOffers.map(item => renderOthersItem(item, true))}
            </View>
          )}

          {/* Completed Requests Section */}
          {(completedRequests.length > 0 || completedOffers.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GENOMFÖRDA ÄRENDEN</Text>
              
              {/* Completed Requests */}
              {completedRequests.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>KLARA FÖRFRÅGNINGAR</Text>
                  {completedRequests.map(item => renderCompletedItem(item, false))}
                </View>
              )}

              {/* Completed Offers */}
              {completedOffers.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>KLARA ERBJUDANDEN</Text>
                  {completedOffers.map(item => renderCompletedItem(item, true))}
                </View>
              )}
            </View>
          )}

          {/* Empty State */}
          {!isLoading && myRequests.length === 0 && myOffers.length === 0 && othersRequests.length === 0 && othersOffers.length === 0 && completedRequests.length === 0 && completedOffers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Välkommen till It Takes a Village!</Text>
              <Text style={styles.emptyStateText}>
                Börja med att skapa din första förfrågan eller erbjudande, eller bjud in villagers att gå med i din community.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {selectedRequest && (
        <RequestOfferModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedRequest(null);
          }}
          data={selectedRequest}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for footer
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  logo: {
    width: 120,
    height: 36,
    resizeMode: 'contain',
  },
  gradientCard: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 10,
    paddingBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
    minHeight: 48,
  },
  requestButton: {
    backgroundColor: 'rgba(255, 105, 180, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  offerButton: {
    backgroundColor: 'rgba(135, 206, 235, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    padding: 24,
    paddingTop: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  // My Requests Styles
  myRequestContainer: {
    backgroundColor: '#FFF8FC',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4F1',
  },
  myRequestHeader: {
    marginBottom: 12,
  },
  myRequestTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  myRequestDate: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  myRequestMessage: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 16,
    lineHeight: 24,
  },
  myRequestStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsGroup: {
    alignItems: 'center',
    minWidth: 60,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
  },
  statsLabel: {
    fontSize: 10,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    opacity: 0.8,
  },
  seeAnswersButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF69B4',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  seeAnswersButtonText: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  // My Offers Styles
  myOfferContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  myOfferHeader: {
    marginBottom: 12,
  },
  myOfferTitle: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  myOfferDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Unbounded-Regular',
  },
  myOfferMessage: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 16,
    lineHeight: 24,
  },
  myOfferStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerStatsGroup: {
    alignItems: 'center',
    minWidth: 60,
  },
  offerStatsValue: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Unbounded-SemiBold',
  },
  offerStatsLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  seeOfferAnswersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  seeOfferAnswersButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  // Completed Items Styles
  completedRequestContainer: {
    backgroundColor: '#F0F8F0',
    borderWidth: 1,
    borderColor: '#D4E6D4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  completedOfferContainer: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#D6EFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  completedHeader: {
    marginBottom: 8,
  },
  completedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  completedRequestTitle: {
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: 'Unbounded-SemiBold',
    letterSpacing: 0.3,
  },
  completedOfferTitle: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    letterSpacing: 0.3,
  },
  completedRequestDate: {
    fontSize: 11,
    color: '#4CAF50',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  completedOfferDate: {
    fontSize: 11,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  completedRequestMessage: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  completedOfferMessage: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  completedDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
  },
  completedRequestDetail: {
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: 'Unbounded-Regular',
  },
  completedOfferDetail: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  // Others' Requests Styles
  othersRequestContainer: {
    backgroundColor: '#F8FCFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4F1FF',
  },
  othersItemHeader: {
    marginBottom: 12,
  },
  othersRequestSender: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  othersRequestDate: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  othersItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  othersRequestMessage: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginRight: 16,
    lineHeight: 24,
  },
  seeQuestionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF69B4',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  seeQuestionButtonText: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  // Others' Offers Styles
  othersOfferContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D6EFFF',
  },
  othersOfferSender: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  othersOfferDate: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  othersOfferMessage: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginRight: 16,
    lineHeight: 24,
  },
  seeOfferQuestionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#87CEEB',
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  seeOfferQuestionButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  // Group Badge
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  groupBadgeText: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  groupBadgeTextOffer: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    opacity: 0.8,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
});