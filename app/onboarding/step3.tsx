import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

interface Group {
  id: string;
  name: string;
}

export default function OnboardingStep3() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [groups, setGroups] = useState<Group[]>([
    { id: '1', name: '' },
    { id: '2', name: '' }
  ]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleAddGroup = () => {
    setGroups(prev => [...prev, { id: String(prev.length + 1), name: '' }]);
  };

  const handleGroupNameChange = (id: string, name: string) => {
    setGroups(prev => prev.map(group => 
      group.id === id ? { ...group, name } : group
    ));
  };

  const handleFinish = () => {
    // Filter out empty groups
    const validGroups = groups.filter(group => group.name.trim() !== '');
    // Here you would typically save the groups to your backend
    console.log('Created groups:', validGroups);
    // Navigate to the main app
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
        <Pressable style={styles.menuButton}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>
      </View>

      <Text style={styles.title}>Sista sista nu,{'\n'}sen är du klar!</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 1:{'\n'}PERSON</Text>
          <View style={[styles.progressBar, styles.completedStep]} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 2:{'\n'}VÄNNER</Text>
          <View style={[styles.progressBar, styles.completedStep]} />
        </View>
        <View style={styles.progressStep}>
          <Text style={styles.stepText}>STEG 3:{'\n'}GRUPPER</Text>
          <View style={[styles.progressBar, styles.activeStep]} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Du kan be om hjälp från alla dina villagers, de du väljer eller en grupp du bestämmer.
        </Text>

        <Text style={styles.subtitle}>
          Skapa en grupp eller två eller skippa och gör det senare.
        </Text>

        {groups.map((group, index) => (
          <View key={group.id} style={styles.groupContainer}>
            <Text style={styles.groupLabel}>GRUPP {index + 1}</Text>
            <TextInput
              style={styles.input}
              value={group.name}
              onChangeText={(text) => handleGroupNameChange(group.id, text)}
              placeholder="T.ex. familjen eller bästisarna"
              placeholderTextColor="#999"
            />
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={handleAddGroup}>
          <Plus color="#FF69B4" size={24} />
          <Text style={styles.addButtonText}>Lägg till fler</Text>
        </Pressable>

        <View style={styles.buttonSpacing} />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable style={styles.skipButton} onPress={handleFinish}>
          <Text style={styles.skipButtonText}>Skippa</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, !groups.some(g => g.name.trim() !== '') && styles.buttonDisabled]} 
          onPress={handleFinish}
        >
          <Text style={[styles.buttonText, !groups.some(g => g.name.trim() !== '') && styles.buttonTextDisabled]}>
            Klar
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  menuButton: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#FF69B4',
  },
  title: {
    fontSize: 32,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  progressStep: {
    flex: 1,
    marginHorizontal: 5,
  },
  stepText: {
    fontSize: 10,
    color: '#FF69B4',
    textAlign: 'center',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
  },
  activeStep: {
    backgroundColor: '#FF69B4',
  },
  completedStep: {
    backgroundColor: '#FF69B4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 30,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 30,
    lineHeight: 24,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Unbounded-Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FF69B4',
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
  },
  buttonSpacing: {
    height: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginLeft: 10,
  },
  buttonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF69B4',
    marginRight: 10,
  },
  skipButtonText: {
    color: '#FF69B4',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});