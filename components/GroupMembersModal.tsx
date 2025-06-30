import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { X, Users, CreditCard as Edit, Save, UserPlus, UserMinus } from 'lucide-react-native';
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
  firstName: string; // Add firstName for confirmation dialog
};

type Villager = {
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState(groupName);
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  
  // Villager selection modal state
  const [showVillagerModal, setShowVillagerModal] = useState(false);
  const [availableVillagers, setAvailableVillagers] = useState<Villager[]>([]);
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>([]);
  const [villagerSearchQuery, setVillagerSearchQuery] = useState('');
  const [isLoadingVillagers, setIsLoadingVillagers] = useState(false);
  const [isAddingVillagers, setIsAddingVillagers] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (visible && session?.user?.id && groupId) {
      fetchGroupMembers();
      checkIfGroupCreator();
    }
  }, [visible, session?.user?.id, groupId]);

  useEffect(() => {
    setEditedGroupName(groupName);
  }, [groupName]);

  const checkIfGroupCreator = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (!error && data) {
        setIsGroupCreator(data.created_by === session.user.id);
      }
    } catch (err) {
      console.error('Error checking group creator:', err);
    }
  };

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
            firstName: user.first_name,
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

  const fetchAvailableVillagers = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoadingVillagers(true);

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
        .eq('status', 'accepted');

      if (connectionsError) {
        console.error('Error fetching villager connections:', connectionsError);
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

      // Get current group member IDs
      const currentMemberIds = new Set(members.map(member => member.id));

      // Transform the data to get villagers not in the group
      const villagersData: Villager[] = (connections || [])
        .map(connection => {
          const otherUser = connection.sender?.id === session.user.id 
            ? connection.receiver 
            : connection.sender;

          if (!otherUser) return null;

          // Skip if user is blocked or already in the group
          if (blockedByMe.has(otherUser.id) || 
              blockedByThem.has(otherUser.id) || 
              currentMemberIds.has(otherUser.id)) {
            return null;
          }

          return {
            id: otherUser.id,
            name: `${otherUser.first_name} ${otherUser.last_name}`,
            phoneNumber: otherUser.phone_number || '',
            memberSince: new Date(otherUser.created_at).toLocaleDateString('sv-SE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            balance: otherUser.minute_balance || 0
          };
        })
        .filter(Boolean) as Villager[];

      setAvailableVillagers(villagersData);
    } catch (err) {
      console.error('Error fetching available villagers:', err);
    } finally {
      setIsLoadingVillagers(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original name
      setEditedGroupName(groupName);
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  const handleSaveGroupName = async () => {
    if (!session?.user?.id || !editedGroupName.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('groups')
        .update({ name: editedGroupName.trim() })
        .eq('id', groupId)
        .eq('created_by', session.user.id); // Ensure only creator can update

      if (updateError) {
        console.error('Error updating group name:', updateError);
        setError('Kunde inte uppdatera gruppnamnet');
        return;
      }

      // Exit editing mode
      setIsEditing(false);
      
    } catch (err) {
      console.error('Error saving group name:', err);
      setError('Ett fel uppstod vid sparande av gruppnamn');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenVillagerModal = () => {
    setSelectedVillagers([]);
    setVillagerSearchQuery('');
    fetchAvailableVillagers();
    setShowVillagerModal(true);
  };

  const handleCloseVillagerModal = () => {
    setShowVillagerModal(false);
    setSelectedVillagers([]);
    setVillagerSearchQuery('');
  };

  const toggleVillagerSelection = (villagerId: string) => {
    setSelectedVillagers(prev =>
      prev.includes(villagerId)
        ? prev.filter(id => id !== villagerId)
        : [...prev, villagerId]
    );
  };

  const handleAddSelectedVillagers = async () => {
    if (!session?.user?.id || selectedVillagers.length === 0 || isAddingVillagers) return;

    try {
      setIsAddingVillagers(true);

      // Add selected villagers to the group
      const memberInserts = selectedVillagers.map(villagerId => ({
        group_id: groupId,
        user_id: villagerId
      }));

      const { error } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (error) {
        console.error('Error adding villagers to group:', error);
        setError('Kunde inte lägga till villagers i gruppen');
        return;
      }

      // Close modal and refresh members
      handleCloseVillagerModal();
      await fetchGroupMembers();

    } catch (err) {
      console.error('Error adding villagers:', err);
      setError('Ett fel uppstod vid tillägg av villagers');
    } finally {
      setIsAddingVillagers(false);
    }
  };

  const handleRemoveMemberPress = (member: GroupMember) => {
    // Don't allow removing yourself
    if (member.id === session?.user?.id) return;
    
    setMemberToRemove(member);
    setShowConfirmModal(true);
  };

  const handleConfirmRemoval = async () => {
    if (!memberToRemove || !session?.user?.id || removingMemberId) return;

    try {
      setRemovingMemberId(memberToRemove.id);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberToRemove.id);

      if (error) {
        console.error('Error removing member from group:', error);
        setError('Kunde inte ta bort medlemmen från gruppen');
        return;
      }

      // Remove member from local state
      setMembers(prev => prev.filter(member => member.id !== memberToRemove.id));
      
      // Close confirmation modal
      setShowConfirmModal(false);
      setMemberToRemove(null);

    } catch (err) {
      console.error('Error removing member:', err);
      setError('Ett fel uppstod vid borttagning av medlem');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCancelRemoval = () => {
    setShowConfirmModal(false);
    setMemberToRemove(null);
  };

  const filteredVillagers = availableVillagers.filter(villager =>
    villager.name.toLowerCase().includes(villagerSearchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(villagerSearchQuery)
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
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
            <View style={styles.groupNameContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.groupNameInput}
                  value={editedGroupName}
                  onChangeText={setEditedGroupName}
                  placeholder="Gruppnamn"
                  placeholderTextColor="#999"
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <Text style={styles.groupName}>{editedGroupName}</Text>
              )}
              
              {isGroupCreator && (
                <Pressable 
                  style={[styles.editButton, isSaving && styles.editButtonDisabled]}
                  onPress={isEditing ? handleSaveGroupName : handleEditToggle}
                  disabled={isSaving || (isEditing && !editedGroupName.trim())}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#87CEEB" />
                  ) : isEditing ? (
                    <Save size={20} color="#87CEEB" />
                  ) : (
                    <Edit size={20} color="#87CEEB" />
                  )}
                  <Text style={[styles.editButtonText, isSaving && styles.editButtonTextDisabled]}>
                    {isSaving ? 'Sparar...' : isEditing ? 'Spara' : 'Ändra'}
                  </Text>
                </Pressable>
              )}
            </View>

            {isGroupCreator && (
              <Pressable 
                style={styles.addVillagerButton}
                onPress={handleOpenVillagerModal}
              >
                <UserPlus size={20} color="#87CEEB" />
                <Text style={styles.addVillagerButtonText}>Lägg till</Text>
              </Pressable>
            )}
            
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
                  <View style={styles.memberCardHeader}>
                    <View style={styles.memberHeader}>
                      <Text style={styles.memberName}>
                        {member.name}
                        {member.id === session?.user?.id && (
                          <Text style={styles.youIndicator}> (Du)</Text>
                        )}
                      </Text>
                    </View>
                    {isGroupCreator && member.id !== session?.user?.id && (
                      <Pressable 
                        style={[styles.removeButton, removingMemberId === member.id && styles.removeButtonDisabled]}
                        onPress={() => handleRemoveMemberPress(member)}
                        disabled={removingMemberId === member.id}
                      >
                        {removingMemberId === member.id ? (
                          <ActivityIndicator size="small" color="#FF4444" />
                        ) : (
                          <UserMinus size={16} color="#FF4444" />
                        )}
                        <Text style={[styles.removeButtonText, removingMemberId === member.id && styles.removeButtonTextDisabled]}>
                          {removingMemberId === member.id ? 'Tar bort...' : 'Ta bort'}
                        </Text>
                      </Pressable>
                    )}
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

      {/* Villager Selection Modal */}
      <Modal
        visible={showVillagerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseVillagerModal}
      >
        <View style={styles.villagerModalContainer}>
          <View style={styles.villagerHeader}>
            <Text style={styles.villagerHeaderTitle}>LÄGG TILL VILLAGERS</Text>
            <Pressable onPress={handleCloseVillagerModal} style={styles.closeButton}>
              <X color="#87CEEB" size={24} />
            </Pressable>
          </View>

          <View style={styles.villagerInfo}>
            <Text style={styles.villagerInfoText}>
              Välj villagers att lägga till i {editedGroupName}
            </Text>
          </View>

          <TextInput
            style={styles.villagerSearchInput}
            value={villagerSearchQuery}
            onChangeText={setVillagerSearchQuery}
            placeholder="Sök bland dina villagers"
            placeholderTextColor="#999"
          />

          <ScrollView style={styles.villagersList} contentContainerStyle={styles.villagersScrollContent}>
            {isLoadingVillagers ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#87CEEB" />
                <Text style={styles.loadingText}>Laddar villagers...</Text>
              </View>
            ) : filteredVillagers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  {villagerSearchQuery ? 'Inga villagers matchar sökningen' : 'Inga tillgängliga villagers'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {villagerSearchQuery ? '' : 'Alla dina villagers är redan medlemmar i denna grupp.'}
                </Text>
              </View>
            ) : (
              filteredVillagers.map((villager) => (
                <Pressable
                  key={villager.id}
                  style={styles.villagerItem}
                  onPress={() => toggleVillagerSelection(villager.id)}
                >
                  <View style={styles.villagerItemInfo}>
                    <Text style={styles.villagerItemName}>{villager.name}</Text>
                    <Text style={styles.villagerItemPhone}>{villager.phoneNumber}</Text>
                  </View>
                  <View style={[
                    styles.villagerCheckbox,
                    selectedVillagers.includes(villager.id) && styles.villagerCheckboxSelected
                  ]}>
                    {selectedVillagers.includes(villager.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {selectedVillagers.length > 0 && (
            <View style={styles.villagerActionContainer}>
              <Pressable 
                style={[styles.addSelectedButton, isAddingVillagers && styles.addSelectedButtonDisabled]}
                onPress={handleAddSelectedVillagers}
                disabled={isAddingVillagers}
              >
                {isAddingVillagers ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <UserPlus size={20} color="white" />
                )}
                <Text style={styles.addSelectedButtonText}>
                  {isAddingVillagers ? 'Lägger till...' : `Lägg till (${selectedVillagers.length})`}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelRemoval}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>
              Är du säker att du vill ta bort {memberToRemove?.firstName} från {editedGroupName}?
            </Text>
            
            <View style={styles.confirmButtons}>
              <Pressable 
                style={styles.confirmButtonNo}
                onPress={handleCancelRemoval}
              >
                <Text style={styles.confirmButtonNoText}>Nej</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.confirmButtonYes, removingMemberId && styles.confirmButtonYesDisabled]}
                onPress={handleConfirmRemoval}
                disabled={!!removingMemberId}
              >
                {removingMemberId ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonYesText}>Ja</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  groupName: {
    fontSize: 24,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
  },
  groupNameInput: {
    fontSize: 24,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    flex: 1,
    borderBottomWidth: 2,
    borderBottomColor: '#87CEEB',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  editButtonText: {
    color: '#87CEEB',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  editButtonTextDisabled: {
    color: '#999',
  },
  addVillagerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  addVillagerButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
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
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberHeader: {
    flex: 1,
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
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#FF4444',
    fontSize: 10,
    fontFamily: 'Unbounded-Regular',
  },
  removeButtonTextDisabled: {
    color: '#999',
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
  // Villager Selection Modal Styles
  villagerModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  villagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  villagerHeaderTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  villagerInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  villagerInfoText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    lineHeight: 22,
  },
  villagerSearchInput: {
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  villagersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  villagersScrollContent: {
    paddingBottom: 100,
  },
  villagerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E4F1FF',
  },
  villagerItemInfo: {
    flex: 1,
  },
  villagerItemName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  villagerItemPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  villagerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#87CEEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  villagerCheckboxSelected: {
    backgroundColor: '#87CEEB',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  villagerActionContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E4F1FF',
  },
  addSelectedButton: {
    backgroundColor: '#87CEEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  addSelectedButtonDisabled: {
    opacity: 0.6,
  },
  addSelectedButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  confirmButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  confirmButtonNo: {
    backgroundColor: '#87CEEB',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  confirmButtonNoText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  confirmButtonYes: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  confirmButtonYesDisabled: {
    opacity: 0.6,
  },
  confirmButtonYesText: {
    color: '#FF4444',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});