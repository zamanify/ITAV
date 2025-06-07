import { View, Text, StyleSheet, Pressable, Image, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen, router } from 'expo-router';
import { useEffect, useState } from 'react';
import RequestOfferModal from '../../components/RequestOfferModal';
import AppFooter from '../../components/AppFooter';

SplashScreen.preventAutoHideAsync();

type SentItem = {
  id: string;
  type: 'request' | 'offer';
  message: string;
  date: string;
  time: string;
  views: number;
  responses: number;
};

type ReceivedItem = {
  id: string;
  type: 'request' | 'offer';
  senderName: string;
  message: string;
  date: string;
  time: string;
  urgency: string;
  estimatedTime: number;
  balance: number;
  groupName?: string;
};

const mockSentItems: SentItem[] = [
  {
    id: '1',
    type: 'request',
    message: 'Någon som kan barnvakta lilla Juno på lördag kväll i ett par timmar?',
    date: 'ONSDAG 12 JUNI',
    time: '09:12',
    views: 12,
    responses: 1
  }
];

const mockReceivedItems: ReceivedItem[] = [
  {
    id: '1',
    type: 'request',
    senderName: 'ALEX SKARSGÅRD',
    message: 'Kan någon ta emot paket åt oss när...',
    date: 'ONSDAG 29 MAJ',
    time: '04:02',
    urgency: 'MEDIUM',
    estimatedTime: 60,
    balance: 0,
    groupName: 'TJÄRHOVSGATAN MAFFIA'
  },
  {
    id: '2',
    type: 'request',
    senderName: 'BILLIE JANSSON',
    message: 'Lite panik, har möte men kan ej få det...',
    date: 'ONSDAG 29 MAJ',
    time: '11:32',
    urgency: 'HÖG',
    estimatedTime: 30,
    balance: -45
  }
];

export default function Dashboard() {
  const [fontsLoaded] = useFonts({
    'Unbounded-Regular': Unbounded_400Regular,
    'Unbounded-SemiBold': Unbounded_600SemiBold,
  });

  const [selectedRequest, setSelectedRequest] = useState<ReceivedItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleNavigateToCreateRequest = () => {
    router.push('/create-request');
  };

  const handleNavigateToCreateOffer = () => {
    router.push('/create-offer');
  };

  const handleOpenModal = (item: ReceivedItem) => {
    setSelectedRequest(item);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/Logo_ITAV.png')}
          style={styles.logo}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#FF69B4', '#9370DB', '#87CEEB']}
          style={styles.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Saldo</Text>
              <Text style={styles.statValue}>0 min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Villagers</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Hoods</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable 
              style={styles.gradientButton}
              onPress={handleNavigateToCreateRequest}
            >
              <Text style={styles.gradientButtonText}>Ny förfrågan</Text>
            </Pressable>
            <Pressable 
              style={[styles.gradientButton, styles.blueButton]}
              onPress={handleNavigateToCreateOffer}
            >
              <Text style={styles.gradientButtonText}>Nytt erbjudande</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {mockSentItems.map((item) => (
            <View key={item.id} style={styles.sentItemContainer}>
              <Text style={styles.sentItemTitle}>
                {item.type === 'request' ? 'DIN FÖRFRÅGAN' : 'DITT ERBJUDANDE'}
              </Text>
              <Text style={styles.sentItemDate}>
                {item.date}, {item.time}
              </Text>
              <Text style={styles.sentItemMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <View style={styles.sentItemStats}>
                <View style={styles.statsGroup}>
                  <Text style={styles.statsLabel}>VISAD</Text>
                  <Text style={styles.statsValue}>{item.views}</Text>
                </View>
                <View style={styles.statsGroup}>
                  <Text style={styles.statsLabel}>SVAR</Text>
                  <Text style={styles.statsValue}>{item.responses}</Text>
                </View>
                <Pressable style={styles.seeAnswersButton}>
                  <Text style={styles.seeAnswersButtonText}>Se svar</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.separator} />

          {mockReceivedItems.map((item) => (
            <View key={item.id} style={styles.receivedItemContainer}>
              <Text style={styles.receivedItemSender}>
                {item.senderName}S {item.type === 'request' ? 'FÖRFRÅGAN' : 'ERBJUDANDE'}
              </Text>
              <Text style={styles.receivedItemDate}>
                {item.date}, {item.time}
              </Text>
              <View style={styles.receivedItemContent}>
                <Text style={styles.receivedItemMessage} numberOfLines={2}>
                  {item.message}
                </Text>
                <Pressable 
                  style={styles.seeQuestionButton}
                  onPress={() => handleOpenModal(item)}
                >
                  <Text style={styles.seeQuestionButtonText}>Se fråga</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {selectedRequest && (
        <RequestOfferModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedRequest(null);
          }}
          data={selectedRequest}
        />
      )}

      <AppFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for footer
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'white',
  },
  logo: {
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  gradientCard: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 10,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Unbounded-Regular',
    marginBottom: 5,
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Unbounded-SemiBold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradientButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Platform.OS === 'web' ? 8 : 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? 36 : 44,
  },
  blueButton: {
    marginRight: 0,
    marginLeft: 10,
  },
  gradientButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Unbounded-Regular',
    textAlign: 'center',
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 20,
  },
  sentItemContainer: {
    marginBottom: 20,
  },
  sentItemTitle: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  sentItemDate: {
    fontSize: 12,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  sentItemMessage: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 12,
  },
  sentItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGroup: {
    marginRight: 20,
  },
  statsLabel: {
    fontSize: 10,
    color: '#FF69B4',
    fontFamily: 'Unbounded-Regular',
  },
  statsValue: {
    fontSize: 14,
    color: '#FF69B4',
    fontFamily: 'Unbounded-SemiBold',
  },
  seeAnswersButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF69B4',
    marginLeft: 'auto',
  },
  seeAnswersButtonText: {
    color: '#FF69B4',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
  separator: {
    height: 1,
    backgroundColor: '#FF69B4',
    marginVertical: 20,
  },
  receivedItemContainer: {
    marginBottom: 20,
  },
  receivedItemSender: {
    fontSize: 16,
    color: '#87CEEB',
    fontFamily: 'Unbounded-SemiBold',
    marginBottom: 4,
  },
  receivedItemDate: {
    fontSize: 12,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginBottom: 8,
  },
  receivedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receivedItemMessage: {
    flex: 1,
    fontSize: 14,
    color: '#87CEEB',
    fontFamily: 'Unbounded-Regular',
    marginRight: 12,
  },
  seeQuestionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  seeQuestionButtonText: {
    color: '#87CEEB',
    fontSize: 12,
    fontFamily: 'Unbounded-Regular',
  },
});