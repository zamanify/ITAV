import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/lib/phone';
import AppFooter from '../../components/AppFooter';


type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'pending' | 'invited' | 'in_app' | 'connected' | 'self' | 'not_app_user' | 'blocked_by_me' | 'blocked_by_them';
  isExistingUser?: boolean;
  userId?: string;
};

export default function InviteScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [invitingContactId, setInvitingContactId] = useState<string | null>(null);


  useEffect(() => {
    if (session?.user?.id) {
      loadContacts();
    }
  }, [session?.user?.id]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let deviceContacts: any[] = [];

      // Get device contacts if not on web
      if (Platform.OS !== 'web') {
        const { status } = await Contacts.requestPermissionsAsync();
        setPermissionStatus(status);

        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          });

          deviceContacts = data
            .filter(contact => contact.name && contact.phoneNumbers?.[0]?.number)
            .map(contact => ({
              id: contact.id,
              name: contact.name || '',
              phoneNumber: contact.phoneNumbers?.[0]?.number || '',
            }));
        }
      }

      // Get current user's data for comparison and display
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select('phone_number, first_name, last_name')
        .eq('id', session?.user?.id)
        .single();

      if (userError) {
        console.error('Error fetching current user:', userError);
      }

      const currentUserPhone = currentUserData?.phone_number ? 
        normalizePhoneNumber(currentUserData.phone_number) : null;

      // Get all app users to check if contacts are existing users
      const { data: allAppUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, phone_number, first_name, last_name');

      if (allUsersError) {
        console.error('Error fetching all app users:', allUsersError);
      }

      // Create a map of normalized phone numbers to user data
      const allAppUsersMap = new Map();
      (allAppUsers || []).forEach(user => {
        if (user.phone_number) {
          const normalized = normalizePhoneNumber(user.phone_number);
          allAppUsersMap.set(normalized, {
            userId: user.id,
            name: `${user.first_name} ${user.last_name}`,
            isExistingUser: true
          });
        }
      });

      // Get blocking relationships
      const [blockedByMeResult, blockedByThemResult] = await Promise.all([
        // Users blocked by current user
        supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', session?.user?.id),
        
        // Users who blocked current user
        supabase
          .from('user_blocks')
          .select('blocker_id')
          .eq('blocked_id', session?.user?.id)
      ]);

      const blockedByMe = new Set((blockedByMeResult.data || []).map(block => block.blocked_id));
      const blockedByThem = new Set((blockedByThemResult.data || []).map(block => block.blocker_id));

      // Get existing invites and connections from database
      const [invitesResult, connectionsResult] = await Promise.all([
        // Get pending invites sent by current user
        supabase
          .from('villager_invite')
          .select('phone_number, email, status')
          .eq('inviter_id', session?.user?.id),
        
        // Get existing connections
        supabase
          .from('villager_connections')
          .select(`
            status,
            sender:sender_id(id, phone_number, first_name, last_name),
            receiver:receiver_id(id, phone_number, first_name, last_name)
          `)
          .or(`sender_id.eq.${session?.user?.id},receiver_id.eq.${session?.user?.id}`)
      ]);

      if (invitesResult.error) {
        console.error('Error fetching invites:', invitesResult.error);
      }

      if (connectionsResult.error) {
        console.error('Error fetching connections:', connectionsResult.error);
      }

      const invites = invitesResult.data || [];
      const connections = connectionsResult.data || [];

      // Create a detailed status map with priority: blocking > connections > invites > app users
      const detailedStatusMap = new Map<string, { 
        status: string; 
        name?: string; 
        isExistingUser?: boolean; 
        userId?: string; 
      }>();

      // First, add blocking relationships (highest priority)
      allAppUsersMap.forEach((userData, phoneNumber) => {
        if (blockedByMe.has(userData.userId)) {
          detailedStatusMap.set(phoneNumber, {
            status: 'blocked_by_me',
            name: userData.name,
            isExistingUser: true,
            userId: userData.userId
          });
        } else if (blockedByThem.has(userData.userId)) {
          detailedStatusMap.set(phoneNumber, {
            status: 'blocked_by_them',
            name: userData.name,
            isExistingUser: true,
            userId: userData.userId
          });
        }
      });

      // Then, add connections (high priority) - only if not already blocked
      connections.forEach(connection => {
        const otherUser = connection.sender?.id === session?.user?.id 
          ? connection.receiver 
          : connection.sender;

        if (otherUser?.phone_number) {
          const normalized = normalizePhoneNumber(otherUser.phone_number);
          const name = `${otherUser.first_name} ${otherUser.last_name}`;
          
          if (!detailedStatusMap.has(normalized)) {
            detailedStatusMap.set(normalized, { 
              status: connection.status === 'accepted' ? 'connected' : 'pending',
              name,
              isExistingUser: true,
              userId: otherUser.id
            });
          }
        }
      });

      // Then, add invites (medium priority) - only if not already in map
      invites.forEach(invite => {
        if (invite.phone_number) {
          const normalized = normalizePhoneNumber(invite.phone_number);
          if (!detailedStatusMap.has(normalized)) {
            detailedStatusMap.set(normalized, { 
              status: invite.status === 'pending' ? 'invited' : 'pending' 
            });
          }
        }
      });

      // Finally, add app users who aren't connected, invited, or blocked (lowest priority)
      allAppUsersMap.forEach((userData, phoneNumber) => {
        if (!detailedStatusMap.has(phoneNumber) && phoneNumber !== currentUserPhone) {
          detailedStatusMap.set(phoneNumber, {
            status: 'in_app',
            name: userData.name,
            isExistingUser: true,
            userId: userData.userId
          });
        }
      });

      // Process device contacts and merge with database info
      const processedContacts: Contact[] = deviceContacts
        .map(contact => {
          const normalized = normalizePhoneNumber(contact.phoneNumber);
          
          // Check if this is the current user's phone number
          if (currentUserPhone && normalized === currentUserPhone) {
            return {
              id: 'self',
              name: currentUserData ? `${currentUserData.first_name} ${currentUserData.last_name}` : contact.name,
              phoneNumber: contact.phoneNumber,
              status: 'self' as const,
              isExistingUser: true,
            };
          }

          const dbInfo = detailedStatusMap.get(normalized);

          return {
            id: contact.id,
            name: dbInfo?.name || contact.name,
            phoneNumber: contact.phoneNumber,
            status: (dbInfo?.status as any) || 'not_app_user',
            isExistingUser: dbInfo?.isExistingUser || false,
            userId: dbInfo?.userId,
          };
        })
        .filter(Boolean) as Contact[];

      // Add any database contacts that aren't in device contacts (but not current user)
      detailedStatusMap.forEach((info, phoneNumber) => {
        // Skip current user's phone number since we handle it above
        if (currentUserPhone && phoneNumber === currentUserPhone) {
          return;
        }

        if (info.name && !processedContacts.find(c => normalizePhoneNumber(c.phoneNumber) === phoneNumber)) {
          processedContacts.push({
            id: `db-${phoneNumber}`,
            name: info.name,
            phoneNumber: phoneNumber,
            status: (info.status as any) || 'not_app_user',
            isExistingUser: info.isExistingUser || false,
            userId: info.userId,
          });
        }
      });

      // Sort contacts: self first, then connected, then by name
      processedContacts.sort((a, b) => {
        if (a.status === 'self') return -1;
        if (b.status === 'self') return 1;
        if (a.status === 'connected' && b.status !== 'connected') return -1;
        if (b.status === 'connected' && a.status !== 'connected') return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(processedContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Ett fel uppstod vid laddning av kontakter');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleInviteContact = async (contact: Contact) => {
    if (!session?.user?.id || contact.status === 'self' || invitingContactId === contact.id) return;

    try {
      // Set loading state immediately
      setInvitingContactId(contact.id);

      const normalizedPhone = normalizePhoneNumber(contact.phoneNumber);

      if (contact.isExistingUser && contact.userId) {
        // This is an existing user, create a villager connection
        const { error } = await supabase
          .from('villager_connections')
          .insert({
            sender_id: session.user.id,
            receiver_id: contact.userId,
            status: 'pending'
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violations
          console.error('Error creating connection:', error);
          return;
        }

        // Update local state - change status to 'pending' for connection request
        setContacts(prevContacts => 
          prevContacts.map(c => 
            c.id === contact.id 
              ? { ...c, status: 'pending' as const }
              : c
          )
        );
      } else {
        // This is not an existing user, create an invite
        const { error } = await supabase
          .from('villager_invite')
          .insert({
            inviter_id: session.user.id,
            phone_number: normalizedPhone,
            status: 'pending'
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violations
          console.error('Error creating invite:', error);
          return;
        }

        // Update local state - change status to 'invited'
        setContacts(prevContacts => 
          prevContacts.map(c => 
            c.id === contact.id 
              ? { ...c, status: 'invited' as const }
              : c
          )
        );
      }

      // Small delay to show the animation
      setTimeout(() => {
        setInvitingContactId(null);
      }, 300);

    } catch (err) {
      console.error('Error inviting contact:', err);
      setInvitingContactId(null);
    }
  };

  const getStatusText = (contact: Contact) => {
    switch (contact.status) {
      case 'self':
        return 'Du';
      case 'connected':
        return 'Ansluten';
      case 'invited':
        return 'Inbjuden';
      case 'pending':
        return 'Väntar på svar';
      case 'in_app':
        return 'Skicka vänförfrågan';
      case 'not_app_user':
        return 'Bjud in till appen';
      case 'blocked_by_me':
        return 'Blockerad av dig';
      case 'blocked_by_them':
        return 'Har blockerat dig';
      default:
        return contact.isExistingUser ? 'Skicka vänförfrågan' : 'Bjud in till appen';
    }
  };

  const getStatusStyle = (contact: Contact) => {
    switch (contact.status) {
      case 'self':
        return styles.statusTextSelf;
      case 'connected':
        return styles.statusTextConnected;
      case 'invited':
        return styles.statusTextInvited;
      case 'pending':
        return styles.statusTextPending;
      case 'in_app':
        return styles.statusTextInApp;
      case 'not_app_user':
        return styles.statusTextNotAppUser;
      case 'blocked_by_me':
        return styles.statusTextBlocked;
      case 'blocked_by_them':
        return styles.statusTextBlocked;
      default:
        return styles.statusTextNotAppUser;
    }
  };

  const canInvite = (contact: Contact) => {
    return contact.status !== 'self' && 
           contact.status !== 'connected' && 
           contact.status !== 'invited' &&
           contact.status !== 'pending' &&
           contact.status !== 'blocked_by_me' &&
           contact.status !== 'blocked_by_them' &&
           (contact.status === 'in_app' || contact.status === 'not_app_user');
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>BJUD IN</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>BJUD IN FLER VILLAGERS</Text>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Lägg till vän eller telefonnummer"
          placeholderTextColor="#999"
        />

        <ScrollView style={styles.contactsList} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Laddar kontakter...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={loadContacts}>
                <Text style={styles.retryButtonText}>Försök igen</Text>
              </Pressable>
            </View>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? `Inga kontakter matchar "${searchQuery}"` : 'Inga kontakter att visa'}
              </Text>
              {Platform.OS !== 'web' && permissionStatus === 'denied' && (
                <Text style={styles.permissionText}>
                  Ge appen tillgång till dina kontakter för att se fler personer att bjuda in
                </Text>
              )}
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <View key={contact.id} style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                  {contact.isExistingUser && contact.status !== 'self' && (
                    <Text style={styles.existingUserBadge}>Använder appen</Text>
                  )}
                </View>
                {canInvite(contact) ? (
                  <Pressable 
                    style={[
                      styles.inviteButton,
                      invitingContactId === contact.id && styles.inviteButtonLoading
                    ]}
                    onPress={() => handleInviteContact(contact)}
                    disabled={invitingContactId === contact.id}
                  >
                    {invitingContactId === contact.id ? (
                      <>
                        <ActivityIndicator size="small\" color="#FF69B4" />
                        <Text style={[
                          styles.inviteButtonText,
                          styles.inviteButtonTextLoading
                        ]}>
                          {contact.status === 'in_app' ? 'Skickar...' : 'Bjuder...'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} color="#FF69B4" />
                        <Text style={styles.inviteButtonText}>
                          {contact.status === 'in_app' ? 'Skicka förfrågan' : 'Bjud in'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <Text style={getStatusStyle(contact)}>
                    {getStatusText(contact)}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>

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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    marginBottom: 20,
  },
  contactsList: {
    flex: 1,
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 2,
  },
  existingUserBadge: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    fontStyle: 'italic',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF69B4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  inviteButtonLoading: {
    backgroundColor: '#FFF8FC',
    borderColor: '#FFB3D9',
  },
  inviteButtonText: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  inviteButtonTextLoading: {
    color: '#FF69B4',
    opacity: 0.7,
    marginLeft: 2, // Small spacing to the right of spinner
  },
  statusTextSelf: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-SemiBold',
  },
  statusTextConnected: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextInvited: {
    color: '#87CEEB',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextPending: {
    color: '#FFA500',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextInApp: {
    color: '#9370DB',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextNotAppUser: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextBlocked: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
});