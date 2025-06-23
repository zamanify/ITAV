import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Users, Chrome as Home, Plus, User, MessageCircle } from 'lucide-react-native';
import { useFonts, Unbounded_400Regular } from '@expo-google-fonts/unbounded';

export default function AppFooter() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  const footerItems = [
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'DINA\nMEDDELANDEN',
      onPress: () => router.replace('/messages'),
    },
    {
      id: 'villagers',
      icon: Users,
      label: 'DINA\nVILLAGERS',
      onPress: () => router.push('/villagers'),
    },
    {
      id: 'groups',
      icon: Home,
      label: 'DINA\nHOODS',
      onPress: () => router.push('/groups'),
    },
    {
      id: 'create-hood',
      icon: Plus,
      label: 'SKAPA\nHOODS',
      onPress: () => router.push('/create-hood'),
    },
    {
      id: 'account',
      icon: User,
      label: 'DITT\nKONTO',
      onPress: () => router.push('/profile'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.footerContent}>
        {footerItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Pressable
              key={item.id}
              style={styles.footerItem}
              onPress={item.onPress}
            >
              <IconComponent size={24} color="#666" />
              <Text style={styles.footerLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
  },
  footerLabel: {
    fontFamily: 'Unbounded-Regular',
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
});