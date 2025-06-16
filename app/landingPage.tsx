import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Unbounded_400Regular,
  Unbounded_600SemiBold,
} from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function LandingPage() {
  const [fontsLoaded, fontError] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (session?.user) {
      router.replace('/(tabs)');
    }
  }, [session]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const handlePress = () => {
    router.push('/onboarding/Step1');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,145,213,1)', 'rgba(3,193,222,1)']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <Image
            style={styles.logo}
            source={require('../assets/images/logotype-vit.svg')}
          />
          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Logga in</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Text style={styles.heading}>
              <Text style={styles.headingBlue}>
                Välkommen till{'\n'}It takes a village,{'\n'}
              </Text>
              <Text style={styles.headingWhite}>
                appen för oss{'\n'}som hjälps åt.
              </Text>
            </Text>

            <Text style={styles.description}>
              Med It takes a village kan du och de dina be om hjälp och erbjuda
              hjälp. Hjälpen loggas i antal minuter, så att ni kan hålla koll på
              när det är er tur att ta gudsonen till lekparken, rasta kompisens
              hund eller bara erbjuda lite andrum i vardagen.
            </Text>

            <Text style={styles.taglineBold}>
                It takes a village gör det{'\n'}lättare att göra livet lättare.
            </Text>

            <Text style={styles.taglinePink}>
                Testa gratis i en månad,{'\n'}därefter kostar det 9 kr/mån.
            </Text>
          </View>

          <View style={styles.ctaButtonContainer}>
            <Pressable style={styles.ctaButton} onPress={handlePress}>
              <Image
                style={styles.ctaButtonImage}
                source={require('../assets/images/rosa-knapp.svg')}
              />
              <Text style={styles.ctaButtonText}>
                Fan vad bra, klart jag är med!
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <Image
          style={styles.handsIllustration}
          source={require('../assets/images/armar.svg')}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  logo: {
    width: 138,
    height: 56,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 126,
    paddingBottom: 140 + 94 + 20,
  },
  mainContent: {
    flex: 1,
    width: '100%',
  },
  heading: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 40,
    lineHeight: 45,
    marginBottom: 10,
  },
  headingBlue: {
    color: '#a2f3ff',
  },
  headingWhite: {
    color: 'white',
  },
  description: {
    fontFamily: 'Unbounded-Regular',
    fontSize: 22,
    lineHeight: 28,
    marginTop: 10,
    color: 'white',
    marginBottom: 20,
  },
  taglineBold: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    marginBottom: 20,
  },
  taglinePink: {
    fontFamily: 'Unbounded-SemiBold',
    fontSize: 16,
    color: '#ffd0ed',
    lineHeight: 24,
  },
  ctaButtonContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  ctaButton: {
    width: 350,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  ctaButtonImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  ctaButtonText: {
    fontFamily: 'Unbounded-SemiBold',
    color: 'white',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
    zIndex: 1,
  },
  handsIllustration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 276,
    resizeMode: 'cover',
    zIndex: 0,
  },
});
