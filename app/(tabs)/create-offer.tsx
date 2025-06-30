import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';
import { useState, useEffect, useContext, useCallback } from 'react';
import { ArrowLeft, Share2, Check, UserPlus, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import VillagerSelectionModal from '../../components/VillagerSelectionModal';
import HoodSelectionModal from '../../components/HoodSelectionModal';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

type TimeType = 'flexible' | 'specific';

export default function CreateOfferScreen() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const { session } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const preselectedVillager = params.preselectedVillager as string;
  const preselectedHood = params.preselectedHood as string;

  const [message, setMessage] = useState('');
  const [timeType, setTimeType] = useState<TimeType>('flexible');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 2); // Default to 2 hours later
    return end;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [showVillagerModal, setShowVillagerModal] = useState(false);
  const [showHoodModal, setShowHoodModal] = useState(false);
  const [selectedVillagers, setSelectedVillagers] = useState<string[]>([]);
  const [selectedHoods, setSelectedHoods] = useState<string[]>([]);
  const [villagerNames, setVillagerNames] = useState<{ [key: string]: string }>({});
  const [hoodNames, setHoodNames] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (preselectedVillager) {
      setSelectedVillagers([preselectedVillager]);
      fetchVillagerName(preselectedVillager);
    }
  }, [preselectedVillager]);

  useEffect(() => {
    if (preselectedHood) {
      setSelectedHoods([preselectedHood]);
      fetchHoodName(preselectedHood);
    }
  }, [preselectedHood]);

  // Fetch names for all selected villagers whenever the selection changes
  useEffect(() => {
    selectedVillagers.forEach(villagerId => {
      if (!villagerNames[villagerId]) {
        fetchVillagerName(villagerId);
      }
    });
  }, [selectedVillagers]);

  // Fetch names for all selected hoods whenever the selection changes
  useEffect(() => {
    selectedHoods.forEach(hoodId => {
      if (!hoodNames[hoodId]) {
        fetchHoodName(hoodId);
      }
    });
  }, [selectedHoods]);

  // Auto-calculate duration when timeType is specific and both dates are set
  useEffect(() => {
    if (timeType === 'specific' && startDate && endDate) {
      const diffInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
      if (diffInMinutes > 0) {
        setDuration(diffInMinutes.toString());
      }
    }
  }, [timeType, startDate, endDate]);

  // Reset form when screen gains focus (user navigates to it)
  useFocusEffect(
    useCallback(() => {
      // Only reset if not coming from preselected params and not currently submitting
      if (!preselectedVillager && !preselectedHood && !isSubmitting) {
        resetForm();
      }
    }, [preselectedVillager, preselectedHood, isSubmitting])
  );

  const resetForm = () => {
    setMessage('');
    setTimeType('flexible');
    setStartDate(new Date());
    const newEndDate = new Date();
    newEndDate.setHours(newEndDate.getHours() + 2);
    setEndDate(newEndDate);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setDuration('');
    setSelectedVillagers([]);
    setSelectedHoods([]);
    setVillagerNames({});
    setHoodNames({});
  };

  const fetchVillagerName = async (villagerId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', villagerId)
        .single();

      if (error) {
        console.error('Error fetching villager name:', error);
        return;
      }

      setVillagerNames(prev => ({
        ...prev,
        [villagerId]: `${data.first_name} ${data.last_name}`
      }));
    } catch (err) {
      console.error('Error fetching villager name:', err);
    }
  };

  const fetchHoodName = async (hoodId: string) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('name')
        .eq('id', hoodId)
        .single();

      if (error) {
        console.error('Error fetching hood name:', error);
        return;
      }

      setHoodNames(prev => ({
        ...prev,
        [hoodId]: data.name
      }));
    } catch (err) {
      console.error('Error fetching hood name:', err);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handlePublish = async () => {
    if (!session?.user?.id || isSubmitting || !message.trim() || !duration.trim()) return;

    try {
      setIsSubmitting(true);

      // Create the offer
      const requestData = {
        requester_id: session.user.id,
        message: message.trim(),
        is_offer: true,
        status: 'open',
        time_slot: timeType === 'specific' ? startDate.toISOString() : null,
        flexible: timeType === 'flexible',
        minutes_logged: parseInt(duration),
      };

      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert(requestData)
        .select()
        .single();

      if (requestError) {
        console.error('Error creating offer:', requestError);
        return;
      }

      // Create request-group associations
      if (selectedHoods.length > 0) {
        const groupInserts = selectedHoods.map(groupId => ({
          request_id: request.id,
          group_id: groupId
        }));

        const { error: groupError } = await supabase
          .from('request_groups')
          .insert(groupInserts);

        if (groupError) {
          console.error('Error creating request-group associations:', groupError);
        }
      }

      // Create request-villager associations
      if (selectedVillagers.length > 0) {
        const villagerInserts = selectedVillagers.map(villagerId => ({
          request_id: request.id,
          user_id: villagerId
        }));

        const { error: villagerError } = await supabase
          .from('request_villagers')
          .insert(villagerInserts);

        if (villagerError) {
          console.error('Error creating request-villager associations:', villagerError);
        }
      }

      // Reset form after successful submission
      resetForm();
      
      router.back();
    } catch (err) {
      console.error('Error publishing offer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // Auto-adjust end date to be at least 1 hour after start date
      if (selectedDate >= endDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setHours(newEndDate.getHours() + 1);
        setEndDate(newEndDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      // Ensure end date is after start date
      if (selectedDate > startDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleVillagerSelection = (selectedIds: string[]) => {
    setSelectedVillagers(selectedIds);
  };

  const handleHoodSelection = (selectedIds: string[]) => {
    setSelectedHoods(selectedIds);
  };

  const removeVillager = (villagerId: string) => {
    setSelectedVillagers(prev => prev.filter(id => id !== villagerId));
  };

  const removeHood = (hoodId: string) => {
    setSelectedHoods(prev => prev.filter(id => id !== hoodId));
  };

  const isFormValid = message.trim() && duration.trim() && (selectedVillagers.length > 0 || selectedHoods.length > 0);

  // Check if duration should be read-only (when specific time is selected)
  const isDurationReadOnly = timeType === 'specific';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#87CEEB" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>SKAPA ERBJUDANDE</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          SKRIV KORTFATTAT DET DU VILL HJÄLPA TILL MED*
        </Text>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Var kort, var tydlig, var du."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>TIDSRAMAR*</Text>
        <View style={styles.buttonGroup}>
          <Pressable
            style={[
              styles.selectionButton,
              timeType === 'flexible' && styles.selectionButtonActive
            ]}
            onPress={() => setTimeType('flexible')}
          >
            <Text style={[
              styles.selectionButtonText,
              timeType === 'flexible' && styles.selectionButtonTextActive
            ]}>Öppet förslag</Text>
          </Pressable>

          <Pressable
            style={[
              styles.selectionButton,
              timeType === 'specific' && styles.selectionButtonActive
            ]}
            onPress={() => setTimeType('specific')}
          >
            <Text style={[
              styles.selectionButtonText,
              timeType === 'specific' && styles.selectionButtonTextActive
            ]}>Sätt dag och klockslag</Text>
          </Pressable>
        </View>

        {timeType === 'specific' && (
          <View style={styles.dateContainer}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Från</Text>
              {Platform.OS === 'ios' ? (
                <View style={styles.datePickerContainer}>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                  </Pressable>
                  {showStartPicker && (
                    <View style={styles.datePickerWrapper}>
                      <DateTimePicker
                        value={startDate}
                        mode="datetime"
                        display="inline"
                        onChange={onStartDateChange}
                        style={styles.iosDatePicker}
                        textColor="#333"
                        accentColor="#87CEEB"
                        themeVariant="light"
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.dateInput}>
                  {Platform.OS === 'web' ? (
                    <input
                      type="datetime-local"
                      value={startDate.toISOString().slice(0, 16)}
                      onChange={(e) => {
                        const newStartDate = new Date(e.target.value);
                        setStartDate(newStartDate);
                        // Auto-adjust end date if needed
                        if (newStartDate >= endDate) {
                          const newEndDate = new Date(newStartDate);
                          newEndDate.setHours(newEndDate.getHours() + 1);
                          setEndDate(newEndDate);
                        }
                      }}
                      style={{
                        border: 'none',
                        fontFamily: 'Unbounded-Regular',
                        fontSize: 16,
                        color: '#333',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <Text style={styles.dateText}>
                      {formatDate(startDate)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Till</Text>
              {Platform.OS === 'ios' ? (
                <View style={styles.datePickerContainer}>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                  </Pressable>
                  {showEndPicker && (
                    <View style={styles.datePickerWrapper}>
                      <DateTimePicker
                        value={endDate}
                        mode="datetime"
                        display="inline"
                        onChange={onEndDateChange}
                        minimumDate={new Date(startDate.getTime() + 60000)} // At least 1 minute after start
                        style={styles.iosDatePicker}
                        textColor="#333"
                        accentColor="#87CEEB"
                        themeVariant="light"
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.dateInput}>
                  {Platform.OS === 'web' ? (
                    <input
                      type="datetime-local"
                      value={endDate.toISOString().slice(0, 16)}
                      min={new Date(startDate.getTime() + 60000).toISOString().slice(0, 16)}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                      style={{
                        border: 'none',
                        fontFamily: 'Unbounded-Regular',
                        fontSize: 16,
                        color: '#333',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <Text style={styles.dateText}>
                      {formatDate(endDate)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={[styles.fullWidth]}>
            <Text style={styles.label}>
              ESTIMERAD TID*
              {isDurationReadOnly && (
                <Text style={styles.autoCalculatedLabel}> (Automatiskt beräknad)</Text>
              )}
            </Text>
            <TextInput
              style={[
                styles.input, 
                styles.durationInput,
                isDurationReadOnly && styles.readOnlyInput
              ]}
              value={duration}
              onChangeText={isDurationReadOnly ? undefined : setDuration}
              placeholder="Ange minuter"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!isDurationReadOnly}
            />
          </View>
        </View>

        <Text style={styles.label}>VÄLJ MOTTAGARE*</Text>
        
        <View style={styles.recipientButtonsContainer}>
          <Pressable 
            style={styles.recipientButton}
            onPress={() => setShowVillagerModal(true)}
          >
            <Text style={styles.recipientButtonText}>Välj Villagers</Text>
          </Pressable>

          <Pressable 
            style={styles.recipientButton}
            onPress={() => setShowHoodModal(true)}
          >
            <Text style={styles.recipientButtonText}>Välj Hoods</Text>
          </Pressable>
        </View>

        {selectedVillagers.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <Text style={styles.selectedItemsTitle}>VALDA VILLAGERS</Text>
            <View style={styles.selectedItemsWrapper}>
              {selectedVillagers.map(id => (
                <View key={id} style={styles.selectedItemTag}>
                  <Text style={styles.selectedItemName}>
                    {villagerNames[id] || 'Laddar...'}
                  </Text>
                  <Pressable 
                    style={styles.removeItemButton}
                    onPress={() => removeVillager(id)}
                  >
                    <X size={16} color="#666" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedHoods.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <Text style={styles.selectedItemsTitle}>VALDA HOODS</Text>
            <View style={styles.selectedItemsWrapper}>
              {selectedHoods.map(id => (
                <View key={id} style={styles.selectedItemTag}>
                  <Text style={styles.selectedItemName}>
                    {hoodNames[id] || 'Laddar...'}
                  </Text>
                  <Pressable 
                    style={styles.removeItemButton}
                    onPress={() => removeHood(id)}
                  >
                    <X size={16} color="#666" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        <VillagerSelectionModal
          visible={showVillagerModal}
          onClose={() => setShowVillagerModal(false)}
          onSelectVillagers={handleVillagerSelection}
          initialSelectedIds={selectedVillagers}
        />

        <HoodSelectionModal
          visible={showHoodModal}
          onClose={() => setShowHoodModal(false)}
          onSelectHoods={handleHoodSelection}
          initialSelectedIds={selectedHoods}
        />

        <View style={styles.spacer} />
      </ScrollView>

      <Pressable 
        style={[styles.publishButton, (!isFormValid || isSubmitting) && styles.publishButtonDisabled]} 
        onPress={handlePublish}
        disabled={!isFormValid || isSubmitting}
      >
        <Text style={styles.publishButtonText}>
          {isSubmitting ? 'Publicerar...' : 'Publicera'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Unbounded-SemiBold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  label: {
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
  },
  autoCalculatedLabel: {
    fontSize: 12,
    color: '#FF69B4',
    fontStyle: 'italic',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  buttonGroup: {
    marginBottom: 20,
  },
  selectionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  selectionButtonActive: {
    backgroundColor: '#87CEEB',
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  selectionButtonTextActive: {
    color: 'white',
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 1,
  },
  dateLabel: {
    width: 60,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
  },
  datePickerContainer: {
    flex: 1,
    position: 'relative',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
  },
  datePickerWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  iosDatePicker: {
    height: 300,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  fullWidth: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
  },
  durationInput: {
    fontFamily: 'Unbounded-Regular',
    fontSize: 16,
    color: '#333',
  },
  readOnlyInput: {
    backgroundColor: '#F8F8F8',
    color: '#666',
  },
  recipientButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  recipientButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
  },
  recipientButtonText: {
    fontSize: 16,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
  },
  selectedItemsContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  selectedItemsTitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 10,
  },
  selectedItemsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectedItemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedItemName: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Unbounded-Regular',
    marginRight: 8,
  },
  removeItemButton: {
    padding: 2,
  },
  spacer: {
    height: 100,
  },
  publishButton: {
    backgroundColor: '#87CEEB',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});