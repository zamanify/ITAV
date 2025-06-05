import { View, Text, StyleSheet, TextInput, Pressable, Image, FlatList, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { Share2, Check } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';

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

  const [searchInput, setSearchInput] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        return;
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

  if (!fontsLoaded) {
    return null;
  }

  const handleNextStep = () => {
    router.push('/onboarding/step3');
  };

  const handleShare = () => {
    // Share functionality will be implemented later
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
        <Pressable style={styles.menuButton}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>
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

      <View style={styles.shareContainer}>
        <Share2 color="#666" size={20} />
        <Text style={styles.shareText}>Gruppinbjudan</Text>
        <Pressable style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Dela</Text>
        </Pressable>
      </View>

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
        style={styles.button}
        onPress={handleNextStep}
      >
        <Text style={styles.buttonText}>Till steg 3</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  menuButton: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#FF69B4',
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
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 20,
  },
  shareText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  shareButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  shareButtonText: {
    color: '#666',
    fontSize: 14,
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});