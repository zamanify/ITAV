import { View, Text, StyleSheet, TextInput, Pressable, Image, FlatList, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import { Check } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/phone';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'pending' | 'invited';
};

export default function OnboardingStep2() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const [searchInput, setSearchInput] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', session?.user?.id)
        .single();
      if (userData?.first_name) {
        setFirstName(userData.first_name);
      }

      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
          ],
        });

        const formattedContacts = data
          .filter(contact => contact.name && contact.phoneNumbers?.[0]?.number)
          .map(contact => ({
            id: contact.id,
            name: contact.name || '',
            phoneNumber: contact.phoneNumbers?.[0]?.number || '',
            status: 'pending' as const,
          }));

        setContacts(formattedContacts);
      }
    })();
  }, []);


  const handleNextStep = async () => {
    if (!session?.user?.id || isSubmitting) return;

    // If no contacts selected, just skip to next step
    if (selectedContacts.length === 0) {
      router.push('/onboarding/step3');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Process each selected contact
      const invitesForSms: { id: string; phoneNumber: string; name: string }[] = [];
      for (const contactId of selectedContacts) {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) continue;

        const normalizedPhone = normalizePhoneNumber(contact.phoneNumber);

        // Use the new RPC function to find user by phone number
        const { data: user_id, error: rpcError } = await supabase.rpc('get_user_id_by_phone', {
          p_phone_number: normalizedPhone
        });

        if (rpcError) {
          console.error('Error calling RPC function:', rpcError);
          setError('Ett fel uppstod vid sökning av användare.');
          continue;
        }

        // If user_id is null, store an invite for later
        if (!user_id) {
          const { data: inviteRow, error: inviteError } = await supabase
            .from('villager_invite')
            .insert({
              inviter_id: session.user.id,
              phone_number: normalizedPhone,
              status: 'pending'
            })
            .select('id')
            .single();

          if (inviteError && inviteError.code !== '23505') {
            console.error('Error creating invite:', inviteError);
            setError('Ett fel uppstod vid skapande av inbjudan.');
          } else if (inviteRow) {
            invitesForSms.push({
              id: inviteRow.id,
              phoneNumber: normalizedPhone,
              name: contact.name.split(' ')[0] || contact.name
            });
          }
          continue;
        }

        // Don't create connection to yourself
        if (user_id === session.user.id) {
          continue;
        }

        // Create villager connection
        const { error: connectionError } = await supabase
          .from('villager_connections')
          .insert({
            sender_id: session.user.id,
            receiver_id: user_id,
            status: 'pending'
          })
          .select()
          .single();

        if (connectionError && connectionError.code !== '23505') { // Ignore unique constraint violations
          console.error('Error creating connection:', connectionError);
        }
      }

      if (invitesForSms.length > 0) {
        await supabase.functions.invoke('send-invite-sms', {
          body: {
            invites: invitesForSms.map(i => ({
              id: i.id,
              phoneNumber: i.phoneNumber,
              receiverFirstName: i.name
            })),
            senderFirstName: firstName
          }
        });
      }

      router.push('/onboarding/step3');
    } catch (err) {
      console.error('Error processing contacts:', err);
      setError('Ett fel uppstod. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchInput.toLowerCase()) ||
    contact.phoneNumber.includes(searchInput)
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable 
      style={styles.contactItem}
      onPress={() => toggleContactSelection(item.id)}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
      </View>
      <View style={[
        styles.checkbox,
        selectedContacts.includes(item.id) && styles.checkedBox
      ]}>
        {selectedContacts.includes(item.id) && (
          <Check size={16} color="white" />
        )}
      </View>
    </Pressable>
  );

  const getButtonText = () => {
    if (isSubmitting) return 'Skapar kontakter...';
    if (selectedContacts.length === 0) return 'Skippa';
    return 'Lägg till';
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>Du är{'\n'}nästan klar!</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 1:{'\n'}PERSON</Text>
          <View style={[styles.progressBar, styles.completedStep]} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 2:{'\n'}VÄNNER</Text>
          <View style={[styles.progressBar, styles.activeStep]} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 3:{'\n'}GRUPPER</Text>
          <View style={styles.progressBar} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Lägg till vän eller telefonnummer"
          value={searchInput}
          onChangeText={setSearchInput}
          placeholderTextColor="#999"
        />
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {Platform.OS !== 'web' && (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={item => item.id}
          style={styles.contactsList}
          contentContainerStyle={styles.contactsContent}
        />
      )}

      <Pressable 
        style={[
          styles.button,
          isSubmitting && styles.buttonDisabled
        ]}
        onPress={handleNextStep}
        disabled={isSubmitting}
      >
        <Text style={[
          styles.buttonText,
          isSubmitting && styles.buttonTextDisabled
        ]}>
          {getButtonText()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 40,
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 30,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  progressStep: {
    flex: 1,
    marginHorizontal: 5,
  },
  stepText: {
    fontSize: 10,
    color: '#FF69B4',
    textAlign: 'center',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
  },
  activeStep: {
    backgroundColor: '#FF69B4',
  },
  completedStep: {
    backgroundColor: '#FF69B4',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
  },
  contactsList: {
    flex: 1,
    marginBottom: 80,
  },
  contactsContent: {
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
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
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF69B4',
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#FF69B4',
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
});