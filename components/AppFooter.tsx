import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Users, UserPlus, Home, User } from 'lucide-react-native';
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
      isCentral: true,
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
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname.startsWith(item.path);
  };

  const renderCentralButton = (item: typeof footerItems[0]) => {
    const active = isActive(item);
    const IconComponent = item.icon;

    return (
      <View style={styles.centralButtonWrapper}>
        <Pressable
          style={styles.centralButtonContainer}
          onPress={item.onPress}
          android_ripple={{ color: '#FF69B4', borderless: true }}
        >
          {active ? (
            <LinearGradient
              colors={['#FF69B4', '#9370DB', '#87CEEB']}
              style={styles.centralButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconComponent 
                size={28} 
                color="white" 
                strokeWidth={2}
              />
            </LinearGradient>
          ) : (
            <View style={styles.centralButtonInactive}>
              <IconComponent 
                size={28} 
                color="#FF69B4" 
                strokeWidth={2}
              />
            </View>
          )}
        </Pressable>
        <Text style={[
          styles.centralButtonLabel,
          active && styles.centralButtonLabelActive
        ]}>
          {item.label}
        </Text>
      </View>
    );
  };

  const renderRegularButton = (item: typeof footerItems[0]) => {
    const active = isActive(item);
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
            size={20} 
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.footer}>
        {footerItems.map((item) => {
          if (item.isCentral) {
            return (
              <View key={item.id} style={styles.centralButtonSlot}>
                {renderCentralButton(item)}
              </View>
            );
          }
          return renderRegularButton(item);
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
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    lineHeight: 10,
    fontFamily: 'Unbounded-Regular',
    letterSpacing: 0.2,
  },
  footerLabelActive: {
    color: '#FF69B4',
  },
  centralButtonSlot: {
    flex: 1,
    alignItems: 'center',
  },
  centralButtonWrapper: {
    alignItems: 'center',
    marginTop: -20,
  },
  centralButtonContainer: {
    marginBottom: 8,
  },
  centralButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centralButtonInactive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  centralButtonLabel: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    lineHeight: 10,
    fontFamily: 'Unbounded-Regular',
    letterSpacing: 0.2,
  },
  centralButtonLabelActive: {
    color: '#FF69B4',
  },
});