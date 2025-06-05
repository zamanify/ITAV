import { View, Text, StyleSheet, Pressable, Image, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, MessageCircle, Settings } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

type Group = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
};

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Familjen',
    memberCount: 5,
    createdAt: '28 maj 2025'
  },
  {
    id: '2',
    name: 'Bästisarna',
    memberCount: 3,
    createdAt: '29 maj 2025'
  },
  {
    id: '3',
    name: 'Grannar',
    memberCount: 8,
    createdAt: '4 mars 2025'
  }
];

export default function GroupsScreen() {
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

  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupActions = (group: Group) => (
    <View style={styles.actionButtons}>
      <Pressable style={styles.actionButton}>
        <Users size={24} color="#666" />
        <Text style={styles.actionButtonText}>VISA{'\n'}MEDLEMMAR</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <MessageCircle size={24} color="#666" />
        <Text style={styles.actionButtonText}>SKICKA{'\n'}FÖRFRÅGAN</Text>
      </Pressable>
      <Pressable style={styles.actionButton}>
        <Settings size={24} color="#666" />
        <Text style={styles.actionButtonText}>HANTERA{'\n'}GRUPP</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#FF69B4" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>DINA HOODS</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök bland dina hoods"
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredGroups.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupDetails}>
                {group.memberCount} medlemmar | Skapad {group.createdAt}
              </Text>
            </View>
            {renderGroupActions(group)}
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
  groupCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  groupInfo: {
    marginBottom: 20,
  },
  groupName: {
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 5,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
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