import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function LandingPage() {
  const [fontsLoaded, fontError] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const handlePress = () => {
    router.push('/onboarding/Step1');
  };

  const handleLogin = () => {
    // Will implement login functionality later
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF69B4', '#9370DB', '#87CEEB']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/Logo_ITAV_white.png')}
            style={styles.logo}
            tintColor="white"
          />
          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Logga in</Text>
          </Pressable>
        </View>
        
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              <Text style={styles.blueText}>Välkommen till{'\n'}It takes a village,{'\n'}</Text>
              <Text>appen för oss{'\n'}som hjälps åt.</Text>
            </Text>
            
            <Text style={styles.description}>
              Med It takes a village kan du och de dina be om hjälp och erbjuda hjälp. Hjälpen loggas i antal minuter, så att ni kan hålla koll på när det är er tur att ta gudsonen till lekparken, rasta kompisens hund eller bara erbjuda lite andrum i vardagen.
            </Text>

            <Text style={[styles.tagline, styles.boldText]}>
              It takes a village gör det{'\n'}lättare att göra livet lättare.
            </Text>

            <Text style={[styles.tagline, { color: '#FFB6C1' }]}>
              Testa gratis i en månad,{'\n'}därefter kostar det 9 kr/mån.
            </Text>
          </View>

          <Pressable style={styles.button} onPress={handlePress}>
            <Text style={[styles.buttonText, styles.boldText]}>Fan vad bra, klart jag är med!</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 20,
    lineHeight: 42,
  },
  blueText: {
    color: '#87CEEB',
  },
  description: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    marginBottom: 20,
    lineHeight: 24,
  },
  tagline: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: 'Unbounded-SemiBold',
  },
  boldText: {
    fontFamily: 'Unbounded-SemiBold',
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});