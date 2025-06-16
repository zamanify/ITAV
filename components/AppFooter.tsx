import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { UserPlus, Chrome as Home, Plus, User } from 'lucide-react-native';
import { useFonts, Unbounded_400Regular, Unbounded_700Bold, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';

export default function AppFooter() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-Bold': Unbounded_700Bold,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const footerItems = [
    {
      id: 'dina-villagers',
      type: 'custom',
      label: 'DINA\nVILLAGERS',
      onPress: () => router.push('/villagers'),
    },
    {
      id: 'invite',
      icon: UserPlus,
      label: 'BJUD IN\nVILLAGERS',
      onPress: () => router.push('/invite'),
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

  const renderFooterItem = (item: any) => {
    if (item.type === 'custom' && item.id === 'dina-villagers') {
      return (
        <Pressable
          key={item.id}
          style={styles.customFooterItem}
          onPress={item.onPress}
          android_ripple={{ color: '#FF69B4', borderless: true }}
        >
          <Image
            source={require('../assets/images/Dina Villagers Button Image.svg')}
            style={styles.customIcon}
          />
          <Text style={styles.customFooterLabel}>{item.label}</Text>
        </Pressable>
      );
    }

    const IconComponent = item.icon;
    return (
      <Pressable
        key={item.id}
        style={styles.footerItem}
        onPress={item.onPress}
        android_ripple={{ color: '#FF69B4', borderless: true }}
      >
        <View style={styles.iconContainer}>
          <IconComponent 
            size={24} 
            color="#666" 
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.footerLabel}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.footer}>
        {footerItems.map(renderFooterItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    lineHeight: 11,
    fontFamily: 'Unbounded-Regular',
    letterSpacing: 0.2,
  },
  // Custom styles for Dina Villagers button
  customFooterItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 12,
    gap: 4,
  },
  customIcon: {
    width: 55,
    height: 54,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  customFooterLabel: {
    fontSize: 10,
    color: '#4d4c4d',
    textAlign: 'center',
    lineHeight: 12.0,
    fontFamily: 'Unbounded-Bold',
    letterSpacing: 0,
    height: 25,
    alignSelf: 'stretch',
  },
});