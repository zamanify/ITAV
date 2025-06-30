import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useContext, useCallback } from 'react';
import { ArrowLeft, Users, MessageCircle, Plus, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import AppFooter from '../../../components/AppFooter';
import GroupMembersModal from '../../../components/GroupMembersModal';
import GroupMessageModal from '../../../components/GroupMessageModal';
import CreateRequestOfferModal from '../../../components/CreateRequestOfferModal';

SplashScreen.preventAutoHideAsync();

type Group = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  isCreator: boolean;
};

export default function GroupsScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedGroupForMessage, setSelectedGroupForMessage] = useState<{ id: string; name: string } | null>(null);
  const [createRequestOfferModalVisible, setCreateRequestOfferModalVisible] = useState(false);
  const [selectedGroupForRequest, setSelectedGroupForRequest] = useState<{ id: string; name: string } | null>(null);
  
  // Group deletion state
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const fetchGroups = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch groups where user is a member
      const { data: groupMemberships, error: membershipsError } = await supabase
        .from('group_members')
        .select(`
          group:group_id(
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', session.user.id);

      if (membershipsError) {
        console.error('Error fetching group memberships:', membershipsError);
        setError('Kunde inte hämta dina hoods');
        return;
      }

      // Get blocked user IDs to filter out from member counts
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

      // Get member counts for each group (excluding blocked users from count)
      const groupsWithCounts = await Promise.all(
        (groupMemberships || []).map(async (membership) => {
          const group = membership.group;
          if (!group) return null;

          // Get all members of this group
          const { data: allMembers, error: membersError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', group.id);

          if (membersError) {
            console.error('Error fetching group members:', membersError);
            return null;
          }

          // Count only non-blocked members
          const nonBlockedMembers = (allMembers || []).filter(member => 
            !blockedByMe.has(member.user_id) && !blockedByThem.has(member.user_id)
          );

          return {
            id: group.id,
            name: group.name,
            memberCount: nonBlockedMembers.length,
            createdAt: new Date(group.created_at).toLocaleDateString('sv-SE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            isCreator: group.created_by === session.user.id
          };
        })
      );

      const validGroups = groupsWithCounts.filter(Boolean) as Group[];
      setGroups(validGroups);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Ett fel uppstod vid hämtning av hoods');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Auto-refresh groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchGroups();
      }
    }, [session?.user?.id, fetchGroups])
  );

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleViewMembers = (group: Group) => {
    setSelectedGroup({ id: group.id, name: group.name });
    setMembersModalVisible(true);
  };

  const handleCloseMembersModal = () => {
    setMembersModalVisible(false);
    setSelectedGroup(null);
  };

  const handleSendMessage = (group: Group) => {
    setSelectedGroupForMessage({ id: group.id, name: group.name });
    setMessageModalVisible(true);
  };

  const handleCloseMessageModal = () => {
    setMessageModalVisible(false);
    setSelectedGroupForMessage(null);
  };

  const handleCreateRequest = (group: Group) => {
    setSelectedGroupForRequest({ id: group.id, name: group.name });
    setCreateRequestOfferModalVisible(true);
  };

  const handleCloseCreateRequestModal = () => {
    setCreateRequestOfferModalVisible(false);
    setSelectedGroupForRequest(null);
  };

  const handleDeleteGroupPress = (group: Group) => {
    setGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete || !session?.user?.id || deletingGroupId) return;

    const performDelete = async () => {
      try {
        setDeletingGroupId(groupToDelete.id);

        // Delete the group (this will cascade delete group_members due to foreign key constraints)
        const { error } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupToDelete.id)
          .eq('created_by', session.user.id); // Ensure only creator can delete

        if (error) {
          console.error('Error deleting group:', error);
          setError('Kunde inte ta bort gruppen. Försök igen.');
          return;
        }

        // Remove group from local state
        setGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
        
        // Close confirmation modal
        setShowDeleteConfirm(false);
        setGroupToDelete(null);

      } catch (err) {
        console.error('Error deleting group:', err);
        setError('Ett fel uppstod vid borttagning av grupp');
      } finally {
        setDeletingGroupId(null);
      }
    };

    await performDelete();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setGroupToDelete(null);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupActions = (group: Group) => (
    <View style={styles.actionButtons}>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleViewMembers(group)}
      >
        <Users size={16} color="#666" />
        <Text style={styles.actionButtonText}>VISA{'\n'}MEDLEMMAR</Text>
      </Pressable>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleSendMessage(group)}
      >
        <MessageCircle size={16} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}MEDDELANDE</Text>
      </Pressable>
      <Pressable 
        style={styles.actionButton}
        onPress={() => handleCreateRequest(group)}
      >
        <Plus size={16} color="#666" />
        <Text style={styles.actionButtonText}>SKAPA{'\n'}FÖRFRÅGAN</Text>
      </Pressable>
    </View>
  );

  const getHeaderTitle = () => {
    if (isLoading) return 'LADDAR HOODS...';
    if (error) return 'FEL VID LADDNING';
    if (groups.length === 0) return 'INGA HOODS ÄNNU';
    if (groups.length === 1) return 'DU HAR 1 HOOD';
    return `DINA ${groups.length} HOODS`;
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color="#87CEEB" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </View>

        {!isLoading && !error && groups.length > 0 && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Sök bland dina hoods"
              placeholderTextColor="#999"
            />
          </View>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Laddar dina hoods...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={fetchGroups}>
                <Text style={styles.retryButtonText}>Försök igen</Text>
              </Pressable>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>Inga hoods än</Text>
              <Text style={styles.emptyDescription}>
                Du är inte medlem i några hoods ännu. Skapa din första hood eller vänta på en inbjudan!
              </Text>
              <Pressable 
                style={styles.createButton} 
                onPress={() => router.push('/create-hood')}
              >
                <Text style={styles.createButtonText}>Skapa din första hood</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {filteredGroups.map((group) => (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupName}>{group.name}</Text>
                    </View>
                    {group.isCreator && (
                      <Pressable 
                        style={[styles.deleteButton, deletingGroupId === group.id && styles.deleteButtonDisabled]}
                        onPress={() => handleDeleteGroupPress(group)}
                        disabled={deletingGroupId === group.id}
                      >
                        {deletingGroupId === group.id ? (
                          <ActivityIndicator size="small" color="#FF4444" />
                        ) : (
                          <Trash2 size={16} color="#FF4444" />
                        )}
                        <Text style={[styles.deleteButtonText, deletingGroupId === group.id && styles.deleteButtonTextDisabled]}>
                          {deletingGroupId === group.id ? 'Tar bort...' : 'Ta bort'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.groupDetails}>
                    <Text style={styles.groupMemberCount}>
                      {group.memberCount} medlemmar
                    </Text>
                    <Text style={styles.groupCreatedDate}>
                      Skapad {group.createdAt}
                    </Text>
                  </View>
                  {renderGroupActions(group)}
                </View>
              ))}
              
              {filteredGroups.length === 0 && searchQuery && (
                <View style={styles.centerContainer}>
                  <Text style={styles.noResultsText}>
                    Inga hoods matchar "{searchQuery}"
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Group Members Modal */}
        {selectedGroup && (
          <GroupMembersModal
            visible={membersModalVisible}
            onClose={handleCloseMembersModal}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
        )}

        {/* Group Message Modal */}
        {selectedGroupForMessage && (
          <GroupMessageModal
            visible={messageModalVisible}
            onClose={handleCloseMessageModal}
            group={selectedGroupForMessage}
          />
        )}

        {/* Create Request/Offer Modal */}
        {selectedGroupForRequest && (
          <CreateRequestOfferModal
            visible={createRequestOfferModalVisible}
            onClose={handleCloseCreateRequestModal}
            groupId={selectedGroupForRequest.id}
            groupName={selectedGroupForRequest.name}
          />
        )}

        <AppFooter />
      </View>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && groupToDelete && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>
              Är du säker att du vill ta bort {groupToDelete.name} med {groupToDelete.memberCount} medlemmar?
            </Text>
            
            <View style={styles.confirmButtons}>
              <Pressable 
                style={styles.confirmButtonNo}
                onPress={handleCancelDelete}
              >
                <Text style={styles.confirmButtonNoText}>Nej</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.confirmButtonYes, deletingGroupId && styles.confirmButtonYesDisabled]}
                onPress={handleConfirmDelete}
                disabled={!!deletingGroupId}
              >
                {deletingGroupId ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonYesText}>Ja</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
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
    borderColor: '#87CEEB',
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
    backgroundColor: '#87CEEB',
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
    color: '#87CEEB',
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
  createButton: {
    backgroundColor: '#87CEEB',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createButtonText: {
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
  // New improved group card styles (blue theme)
  groupCard: {
    backgroundColor: '#F8FCFF',
    borderWidth: 1,
    borderColor: '#E4F1FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupHeader: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
  },
  deleteButton: {
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
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 10,
    fontFamily: 'Unbounded-Regular',
  },
  deleteButtonTextDisabled: {
    color: '#999',
  },
  groupDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupMemberCount: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  groupCreatedDate: {
    fontSize: 14,
    color: '#87CEEB',
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
  actionButtonText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Unbounded-Regular',
    lineHeight: 10,
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1000,
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