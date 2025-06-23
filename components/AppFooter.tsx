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
      onPress: () => router.push('/messages'),
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