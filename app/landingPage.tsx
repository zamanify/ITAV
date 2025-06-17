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

  const handleGetStarted = () => {
    router.push('/onboarding/Step1');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF91D5', '#03C1DE']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header with Logo and Login Button */}
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/logotype-vit.svg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Logga in</Text>
          </Pressable>
        </View>
        
        {/* Main Content */}
        <View style={styles.content}>
          {/* Headline */}
          <View style={styles.headlineContainer}>
            <Text style={styles.headline}>
              <Text style={styles.blueText}>
                Välkommen till{'\n'}
                It takes a village,{'\n'}
              </Text>
              <Text style={styles.whiteText}>
                appen för oss{'\n'}
                som hjälps åt.
              </Text>
            </Text>
          </View>

          {/* Description Text */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Med It takes a village kan du och de dina be om hjälp och erbjuda hjälp. 
              Hjälpen loggas i antal minuter, så att ni kan hålla koll på när det är er tur 
              att ta gudsonen till lekparken, rasta kompisens hund eller bara erbjuda lite 
              andrum i vardagen.
            </Text>

            <Text style={styles.tagline}>
              It takes a village gör det lättare att göra livet lättare.
            </Text>

            <Text style={styles.pricing}>
              Testa gratis i en månad, därefter kostar det 9 kr/mån.
            </Text>
          </View>
        </View>

        {/* Hands Illustration */}
        <View style={styles.handsContainer}>
          <Image 
            source={require('../assets/images/armar.svg')}
            style={styles.handsImage}
            resizeMode="cover"
          />
        </View>

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <Pressable style={styles.ctaButton} onPress={handleGetStarted}>
            <Image 
              source={require('../assets/images/rosa-knapp.svg')}
              style={styles.ctaButtonBackground}
              resizeMode="contain"
            />
            <Text style={styles.ctaButtonText}>
              Fan vad bra, klart jag är med!
            </Text>
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
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 17,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 138,
    height: 56,
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
  },
  content: {
    position: 'absolute',
    top: 124,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  headlineContainer: {
    marginBottom: 40,
  },
  headline: {
    fontSize: 36,
    fontFamily: 'Unbounded-SemiBold',
    lineHeight: 36,
  },
  blueText: {
    color: '#A2F3FF',
  },
  whiteText: {
    color: 'white',
  },
  descriptionContainer: {
    paddingRight: 10,
  },
  description: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Unbounded-Regular',
    lineHeight: 30,
    marginBottom: 32,
  },
  tagline: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Unbounded-SemiBold',
    lineHeight: 30,
    marginBottom: 32,
  },
  pricing: {
    color: '#FFD0ED',
    fontSize: 18,
    fontFamily: 'Unbounded-SemiBold',
    lineHeight: 30,
  },
  handsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 251,
    zIndex: 1,
  },
  handsImage: {
    width: '100%',
    height: '100%',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 43,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  ctaButton: {
    width: 400,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ctaButtonBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Unbounded-SemiBold',
    lineHeight: 18,
    textAlign: 'center',
    zIndex: 1,
  },
});