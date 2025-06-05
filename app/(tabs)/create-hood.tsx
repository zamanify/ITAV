import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Check, UserPlus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
};

type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
};

export default function CreateHoodScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Mock data for existing villagers
  const existingVillagers: Villager[] = [
    {
      id: '1',
      name: 'Sonny Fahlberg',
      phoneNumber: '+4671727505',
      memberSince: '30 maj 2025'
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
            }));

          setContacts(formattedContacts);
        }
      })();
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

  const handleCreateHood = () => {
    router.back();
  };

  const toggleVillagerSelection = (villagerId: string) => {
    setSelectedVillagers(prev =>
      prev.includes(villagerId)
        ? prev.filter(id => id !== villagerId)
        : [...prev, villagerId]
    );
  };

  const filteredVillagers = existingVillagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

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
        <Text style={styles.headerTitle}>SKAPA HOOD</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>DÖP DIN NYA GRUPP</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="T.ex familj, bästisar eller dagispappor"
          placeholderTextColor="#999"
        />

        <Text style={[styles.sectionTitle, styles.marginTop]}>LÄGG TILL FLER VILLAGERS</Text>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowResults(text.length > 0);
          }}
          placeholder="Lägg till vän via namn eller mobil"
          placeholderTextColor="#999"
        />

        {showResults && (searchQuery.length > 0) && (
          <View style={styles.resultsContainer}>
            {filteredVillagers.length > 0 && (
              <View>
                <Text style={styles.resultsSectionTitle}>BEFINTLIGA VILLAGERS</Text>
                {filteredVillagers.map((villager) => (
                  <Pressable
                    key={villager.id}
                    style={styles.resultItem}
                    onPress={() => toggleVillagerSelection(villager.id)}
                  >
                    <Text style={styles.resultName}>{villager.name}</Text>
                    <View style={[
                      styles.checkCircle,
                      selectedVillagers.includes(villager.id) && styles.checkCircleSelected
                    ]}>
                      {selectedVillagers.includes(villager.id) && (
                        <Check size={16} color="white" />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {filteredContacts.length > 0 && (
              <View>
                <Text style={styles.resultsSectionTitle}>UR DIN ADRESSBOK</Text>
                {filteredContacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    style={styles.resultItem}
                    onPress={() => toggleVillagerSelection(contact.id)}
                  >
                    <Text style={styles.resultName}>{contact.name}</Text>
                    <UserPlus color="#666" size={20} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.shareContainer}>
          <Share2 color="#666" size={20} />
          <Text style={styles.shareText}>Gruppinbjudan</Text>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Dela</Text>
          </Pressable>
        </View>

        {selectedVillagers.map(id => {
          const villager = existingVillagers.find(v => v.id === id);
          if (!villager) return null;
          
          return (
            <View key={villager.id} style={styles.villagerItem}>
              <View style={styles.villagerInfo}>
                <Text style={styles.villagerName}>{villager.name}</Text>
                <Text style={styles.villagerDetails}>
                  {villager.phoneNumber} | Medlem sedan {villager.memberSince}
                </Text>
              </View>
              <View style={styles.checkCircle}>
                <Check size={16} color="white" />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Pressable 
        style={[styles.createButton, !groupName && styles.createButtonDisabled]} 
        onPress={handleCreateHood}
        disabled={!groupName}
      >
        <Text style={styles.createButtonText}>Spara hood</Text>
      </Pressable>
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
  marginTop: {
    marginTop: 20,
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
  resultsContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
  },
  resultsSectionTitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    padding: 10,
    backgroundColor: '#F5F5F5',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
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
  villagerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  villagerInfo: {
    flex: 1,
  },
  villagerName: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 4,
  },
  villagerDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF69B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkCircleSelected: {
    backgroundColor: '#FF69B4',
  },
  createButton: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    margin: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});