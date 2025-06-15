import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Users, UserPlus, Home, Plus, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Unbounded_400Regular } from '@expo-google-fonts/unbounded';

export default function AppFooter() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
  });

  const pathname = usePathname();

  if (!fontsLoaded) {
    return null;
  }

  const footerItems = [
    {
      id: 'villagers',
      icon: Users,
      label: 'VILLAGERS',
      path: '/villagers',
      onPress: () => router.push('/villagers'),
    },
    {
      id: 'invite',
      icon: UserPlus,
      label: 'BJUD IN',
      path: '/invite',
      onPress: () => router.push('/invite'),
    },
    {
      id: 'home',
      icon: Home,
      label: 'HEM',
      path: '/',
      onPress: () => router.push('/(tabs)'),
      isCenter: true,
    },
    {
      id: 'groups',
      icon: Users,
      label: 'HOODS',
      path: '/groups',
      onPress: () => router.push('/groups'),
    },
    {
      id: 'account',
      icon: User,
      label: 'KONTO',
      path: '/profile',
      onPress: () => router.push('/profile'),
    },
  ];

  const isActive = (item: typeof footerItems[0]) => {
    if (item.path === '/') {
      return pathname === '/' || pathname === '/(tabs)' || pathname.startsWith('/(tabs)');
    }
    return pathname.startsWith(item.path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.footer}>
        {footerItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item);

          if (item.isCenter) {
            return (
              <Pressable
                key={item.id}
                style={styles.centerButtonContainer}
                onPress={item.onPress}
              >
                <LinearGradient
                  colors={active ? ['#FF69B4', '#87CEEB'] : ['#E5E5E5', '#E5E5E5']}
                  style={styles.centerButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent 
                    size={28} 
                    color={active ? 'white' : '#999'}
                    strokeWidth={2}
                  />
                </LinearGradient>
                <Text style={[
                  styles.centerButtonLabel,
                  active && styles.centerButtonLabelActive
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={item.id}
              style={styles.footerItem}
              onPress={item.onPress}
            >
              <View style={styles.iconContainer}>
                <IconComponent 
                  size={24} 
                  color={active ? '#FF69B4' : '#999'} 
                  strokeWidth={1.5}
                />
              </View>
              <Text style={[
                styles.footerLabel,
                active && styles.footerLabelActive
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
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
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
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
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    lineHeight: 12,
    fontFamily: 'Unbounded-Regular',
    letterSpacing: 0.2,
  },
  footerLabelActive: {
    color: '#FF69B4',
  },
  centerButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: -20,
    flex: 1,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    lineHeight: 12,
    fontFamily: 'Unbounded-Regular',
    letterSpacing: 0.2,
  },
  centerButtonLabelActive: {
    color: '#FF69B4',
  },
});