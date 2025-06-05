import { View, Text, StyleSheet, Pressable, Image, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, MessageCircle, UserX } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

type Villager = {
  id: string;
  name: string;
  phoneNumber: string;
  memberSince: string;
  balance: number;
  status: 'connected' | 'pending' | 'request_received' | 'blocked';
};

const mockVillagers: Villager[] = [
  {
    id: '1',
    name: 'Billie Jansson',
    phoneNumber: '+46707865400',
    memberSince: '28 maj 2025',
    balance: 23,
    status: 'connected'
  },
  {
    id: '2',
    name: 'Eija Skarsgård',
    phoneNumber: '+46761727505',
    memberSince: '29 maj 2025',
    balance: 0,
    status: 'pending'
  },
  {
    id: '3',
    name: 'Alexander Skarsgård',
    phoneNumber: '+9723017744',
    memberSince: '4 mars 2025',
    balance: -125,
    status: 'connected'
  }
];

export default function VillagersScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const filteredVillagers = mockVillagers.filter(villager =>
    villager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    villager.phoneNumber.includes(searchQuery)
  );

  const renderVillagerActions = (villager: Villager) => (
    <View style={styles.actionButtons}>
      <Pressable style={styles.actionButton}>
        <UserPlus size={24} color="#666" />
        <Text style={styles.actionButtonText}>LÄGG TILL{'\n'}I GRUPP</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <MessageCircle size={24} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}MEDDELANDE</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <UserX size={24} color="#666" />
        <Text style={styles.actionButtonText}>BLOCKERA{'\n'}OCH RADERA</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>DU HAR 3 NYA VILLAGERS</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök bland dina villagers"
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content}>
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
      </ScrollView>
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