import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Share2, UserPlus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';

SplashScreen.preventAutoHideAsync();

type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
  status?: 'pending' | 'invited' | 'in_app';
};

export default function InviteScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Mock data for existing contacts
  const mockContacts: Contact[] = [
    {
      id: '1',
      name: 'Dan Berggren/1',
      phoneNumber: '+46707865400',
      status: 'in_app'
    },
    {
      id: '2',
      name: 'Gustaf Sehlstedt/Le Bur...',
      phoneNumber: '+4676172750',
      status: 'pending'
    },
    {
      id: '3',
      name: 'Jörg/1',
      phoneNumber: '+4917230177441',
      status: 'pending'
    }
  ];

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }

    if (Platform.OS !== 'web') {
      (async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          });

          const formattedContacts = data
            .filter(contact => contact.name && contact.phoneNumbers?.[0]?.number)
            .map(contact => ({
              id: contact.id,
              name: contact.name || '',
              phoneNumber: contact.phoneNumbers?.[0]?.number || '',
              status: 'pending'
            }));

          setContacts([...mockContacts, ...formattedContacts]);
        } else {
          setContacts(mockContacts);
        }
      })();
    } else {
      setContacts(mockContacts);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleShare = () => {
    // Implement share functionality
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_app':
        return 'Bli vän';
      case 'pending':
        return 'Bjud in till appen';
      default:
        return 'Bjud in till appen';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'in_app':
        return styles.statusTextInApp;
      case 'pending':
        return styles.statusTextPending;
      default:
        return styles.statusTextPending;
    }
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

        <View style={styles.shareContainer}>
          <Share2 color="#666" size={20} />
          <Text style={styles.shareText}>Gruppinbjudan</Text>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Dela</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.contactsList}>
          {filteredContacts.map((contact) => (
            <View key={contact.id} style={styles.contactItem}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
              </View>
              <Text style={getStatusStyle(contact.status || 'pending')}>
                {getStatusText(contact.status || 'pending')}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
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
  },
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 20,
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
  },
  statusTextInApp: {
    color: '#FF69B4',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  statusTextPending: {
    color: '#87CEEB',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  }
});