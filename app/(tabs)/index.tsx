import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Users, MessageSquare, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

interface DashboardData {
  activeRequests: number;
  activeOffers: number;
  connections: number;
  minuteBalance: number;
  recentActivity: Array<{
    id: string;
    type: 'request' | 'offer' | 'response';
    message: string;
    created_at: string;
  }>;
}

export default function HomeTab() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      // Fetch user data with minute balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('minute_balance')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw new Error(`Error fetching user data: ${userError.message}`);
      }

      // Fetch active requests count
      const { count: requestsCount, error: requestsError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .eq('status', 'open')
        .eq('is_offer', false);

      if (requestsError) {
        throw new Error(`Error fetching requests: ${requestsError.message}`);
      }

      // Fetch active offers count
      const { count: offersCount, error: offersError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .eq('status', 'open')
        .eq('is_offer', true);

      if (offersError) {
        throw new Error(`Error fetching offers: ${offersError.message}`);
      }

      // Fetch connections count
      const { count: connectionsCount, error: connectionsError } = await supabase
        .from('villager_connections')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (connectionsError) {
        throw new Error(`Error fetching connections: ${connectionsError.message}`);
      }

      // Fetch recent activity
      const { data: recentActivity, error: activityError } = await supabase
        .from('requests')
        .select('id, message, created_at, is_offer')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activityError) {
        throw new Error(`Error fetching recent activity: ${activityError.message}`);
      }

      const formattedActivity = recentActivity?.map(item => ({
        id: item.id,
        type: item.is_offer ? 'offer' : 'request' as 'request' | 'offer' | 'response',
        message: item.message,
        created_at: item.created_at,
      })) || [];

      setDashboardData({
        activeRequests: requestsCount || 0,
        activeOffers: offersCount || 0,
        connections: connectionsCount || 0,
        minuteBalance: userData?.minute_balance || 0,
        recentActivity: formattedActivity,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Error fetching user data:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const retryConnection = () => {
    setLoading(true);
    fetchDashboardData();
  };

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (authError || error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{authError || error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to continue</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Here's what's happening in your village</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dashboardData?.minuteBalance || 0}</Text>
          <Text style={styles.statLabel}>Minutes Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dashboardData?.connections || 0}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dashboardData?.activeRequests || 0}</Text>
          <Text style={styles.statLabel}>Active Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dashboardData?.activeOffers || 0}</Text>
          <Text style={styles.statLabel}>Active Offers</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/create-request')}
          >
            <Plus size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>New Request</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/create-offer')}
          >
            <Plus size={24} color="#34C759" />
            <Text style={styles.actionButtonText}>New Offer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {dashboardData.recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                {activity.type === 'request' ? (
                  <MessageSquare size={16} color="#007AFF" />
                ) : activity.type === 'offer' ? (
                  <Users size={16} color="#34C759" />
                ) : (
                  <Clock size={16} color="#FF9500" />
                )}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage} numberOfLines={2}>
                  {activity.message}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  recentActivity: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});