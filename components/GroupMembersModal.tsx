import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { X, Users } from 'lucide-react-native';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

type GroupMember = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
};

export default function GroupMembersModal({ visible, onClose, groupId, groupName }: Props) {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && session?.user?.id && groupId) {
      fetchGroupMembers();
    }
  }, [visible, session?.user?.id, groupId]);

  const fetchGroupMembers = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch group members with user details
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user:user_id(
            id,
            first_name,
            last_name,
            phone_number,
            minute_balance,
            created_at
          )
        `)
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        setError('Kunde inte hämta gruppmedlemmar');
        return;
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

      // Transform the data and filter out blocked users
      const membersData: GroupMember[] = (groupMembers || [])
        .map(member => {
          const user = member.user;
          if (!user) return null;

          // Skip if user is blocked
          if (blockedByMe.has(user.id) || blockedByThem.has(user.id)) {
            return null;
          }

          return {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            phoneNumber: user.phone_number || '',
            memberSince: new Date(user.created_at).toLocaleDateString('sv-SE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            balance: user.minute_balance || 0
          };
        })
        .filter(Boolean) as GroupMember[];

      // Sort members: current user first, then by name
      membersData.sort((a, b) => {
        if (a.id === session.user.id) return -1;
        if (b.id === session.user.id) return 1;
        return a.name.localeCompare(b.name);
      });

      setMembers(membersData);
    } catch (err) {
      console.error('Error fetching group members:', err);
      setError('Ett fel uppstod vid hämtning av medlemmar');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Users size={24} color="#87CEEB" />
            <Text style={styles.headerTitle}>GRUPPMEDLEMMAR</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color="#87CEEB" size={24} />
          </Pressable>
        </View>

        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.groupSubtext}>
            {members.length} {members.length === 1 ? 'medlem' : 'medlemmar'} i gruppen
          </Text>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <ScrollView style={styles.membersList} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#87CEEB" />
              <Text style={styles.loadingText}>Laddar medlemmar...</Text>
            </View>
          ) : members.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Inga medlemmar att visa</Text>
              <Text style={styles.emptySubtext}>
                Alla medlemmar kan vara blockerade eller gruppen är tom.
              </Text>
            </View>
          ) : (
            members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>
                    {member.name}
                    {member.id === session?.user?.id && (
                      <Text style={styles.youIndicator}> (Du)</Text>
                    )}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberPhone}>{member.phoneNumber}</Text>
                  <Text style={styles.memberBalance}>
                    Saldo {member.balance > 0 ? '+' : ''}{member.balance} min
                  </Text>
                </View>
                <View style={styles.memberFooter}>
                  <Text style={styles.memberSince}>
                    Medlem sedan {member.memberSince}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  groupInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4F1FF',
  },
  groupName: {
    fontSize: 24,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 8,
  },
  groupSubtext: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  membersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
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
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  memberCard: {
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  memberHeader: {
    marginBottom: 8,
  },
  memberName: {
    fontSize: 18,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
  },
  youIndicator: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    fontWeight: 'normal',
  },
  memberDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  memberBalance: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    fontWeight: '600',
  },
  memberFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E4F1FF',
    paddingTop: 8,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
  },
});