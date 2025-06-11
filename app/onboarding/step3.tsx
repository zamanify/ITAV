import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useContext } from 'react';
import { Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';


interface Group {
  id: string;
  name: string;
}

export default function OnboardingStep3() {

  const { session } = useContext(AuthContext);
  const [groups, setGroups] = useState<Group[]>([
    { id: '1', name: '' },
    { id: '2', name: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleAddGroup = () => {
    setGroups(prev => [...prev, { id: String(prev.length + 1), name: '' }]);
  };

  const handleGroupNameChange = (id: string, name: string) => {
    setGroups(prev => prev.map(group => 
      group.id === id ? { ...group, name } : group
    ));
  };

  const handleFinish = async () => {
    if (isSubmitting) return;

    // Filter out empty groups
    const validGroups = groups.filter(group => group.name.trim() !== '');
    
    // If no groups, just skip to main app
    if (validGroups.length === 0) {
      router.replace('/(tabs)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!session?.user?.id) {
        setError('Användarinformation saknas. Försök igen.');
        return;
      }

      // Create groups in database
      const groupsToInsert = validGroups.map(group => ({
        name: group.name.trim(),
        created_by: session.user.id
      }));

      const { error: insertError } = await supabase
        .from('groups')
        .insert(groupsToInsert);

      if (insertError) {
        console.error('Error creating groups:', insertError);
        setError('Ett fel uppstod vid skapande av grupper. Försök igen.');
        return;
      }

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Skapar grupper...';
    const hasGroups = groups.some(g => g.name.trim() !== '');
    return hasGroups ? 'Lägg till' : 'Skippa';
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

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.buttonSpacing} />
      </ScrollView>

      <Pressable 
        style={[
          styles.button,
          isSubmitting && styles.buttonDisabled
        ]} 
        onPress={handleFinish}
        disabled={isSubmitting}
      >
        <Text style={[
          styles.buttonText,
          isSubmitting && styles.buttonTextDisabled
        ]}>
          {getButtonText()}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
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
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonSpacing: {
    height: 100,
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
});