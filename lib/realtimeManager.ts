type SubscriptionCallback = (payload: any) => void;

interface ActiveSubscription {
  channel: any;
  callbacks: Set<SubscriptionCallback>;
  lastActivity: number;
  subscriptionCount: number;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private supabase: any;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.startCleanupInterval();
  }

  static getInstance(supabaseClient?: any): RealtimeManager {
    if (!RealtimeManager.instance) {
      if (!supabaseClient) {
        throw new Error('Supabase client required for first initialization');
      }
      RealtimeManager.instance = new RealtimeManager(supabaseClient);
    }
    return RealtimeManager.instance;
  }

  private startCleanupInterval() {
    // Clean up inactive subscriptions every 30 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const INACTIVE_THRESHOLD = 60000; // 1 minute

      for (const [key, subscription] of this.activeSubscriptions.entries()) {
        if (now - subscription.lastActivity > INACTIVE_THRESHOLD && subscription.callbacks.size === 0) {
          console.log('🧹 [RealtimeManager] Cleaning up inactive subscription:', key);
          subscription.channel.unsubscribe();
          this.supabase.removeChannel(subscription.channel);
          this.activeSubscriptions.delete(key);
        }
      }
    }, 30000);
  }

  private isChannelHealthy(channel: any): boolean {
    // Check if the channel is in a healthy state
    const state = channel?.state;
    const isHealthy = state === 'joined' || state === 'joining';
    
    if (!isHealthy) {
      console.log('⚠️ [RealtimeManager] Channel state check:', {
        state,
        isHealthy
      });
    }
    
    return isHealthy;
  }

  subscribeToMessages(
    currentUserId: string,
    chatPartnerId: string,
    callback: SubscriptionCallback,
    context: string
  ): () => void {
    // Create a unique key for this message subscription
    // Use sorted IDs to ensure both users use the same subscription
    const sortedIds = [currentUserId, chatPartnerId].sort();
    const subscriptionKey = `messages-${sortedIds[0]}-${sortedIds[1]}`;

    console.log(`📡 [RealtimeManager] ${context} subscribing to:`, subscriptionKey);

    let subscription = this.activeSubscriptions.get(subscriptionKey);

    // Check if existing subscription has a healthy channel
    if (subscription && !this.isChannelHealthy(subscription.channel)) {
      console.log(`🔄 [RealtimeManager] Existing channel for ${subscriptionKey} is unhealthy, recreating...`);
      
      // Remove the unhealthy channel
      subscription.channel.unsubscribe();
      this.supabase.removeChannel(subscription.channel);
      this.activeSubscriptions.delete(subscriptionKey);
      subscription = null;
    }

    if (!subscription) {
      console.log(`🆕 [RealtimeManager] Creating new subscription for:`, subscriptionKey);
      
      // Create the filter string for logging
      const filterString = `or(and(sender_id.eq.${sortedIds[0]},receiver_id.eq.${sortedIds[1]}),and(sender_id.eq.${sortedIds[1]},receiver_id.eq.${sortedIds[0]}))`;
      console.log(`🔍 [RealtimeManager] Messages filter for ${subscriptionKey}:`, filterString);
      
      // Create new subscription with stable channel name (no timestamp)
      const channel = this.supabase
        .channel(`shared-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: filterString
          },
          (payload) => {
            console.log(`📨 [RealtimeManager] Message INSERT received for ${subscriptionKey}:`, {
              messageId: payload.new.id,
              from: payload.new.sender_id,
              to: payload.new.receiver_id,
              callbackCount: subscription?.callbacks.size || 0,
              eventType: payload.eventType
            });
            
            // Update activity timestamp
            if (subscription) {
              subscription.lastActivity = Date.now();
              // Notify all callbacks
              subscription.callbacks.forEach(cb => {
                try {
                  cb(payload);
                } catch (error) {
                  console.error(`❌ [RealtimeManager] Error in message callback:`, error);
                }
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: filterString
          },
          (payload) => {
            console.log(`📝 [RealtimeManager] Message UPDATE received for ${subscriptionKey}:`, {
              messageId: payload.new.id,
              isRead: payload.new.is_read,
              callbackCount: subscription?.callbacks.size || 0
            });
            
            if (subscription) {
              subscription.lastActivity = Date.now();
              subscription.callbacks.forEach(cb => {
                try {
                  cb(payload);
                } catch (error) {
                  console.error(`❌ [RealtimeManager] Error in message update callback:`, error);
                }
              });
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`🔌 [RealtimeManager] Subscription ${subscriptionKey} status:`, status);
          if (err) {
            console.error(`❌ [RealtimeManager] Subscription ${subscriptionKey} error:`, err);
          }
        });

      subscription = {
        channel,
        callbacks: new Set(),
        lastActivity: Date.now(),
        subscriptionCount: 0
      };

      this.activeSubscriptions.set(subscriptionKey, subscription);
    } else {
      console.log(`♻️ [RealtimeManager] Reusing existing subscription for:`, subscriptionKey);
    }

    // Add callback to the subscription
    subscription.callbacks.add(callback);
    subscription.subscriptionCount++;
    subscription.lastActivity = Date.now();

    console.log(`✅ [RealtimeManager] ${context} subscribed. Active callbacks:`, subscription.callbacks.size);

    // Return unsubscribe function
    return () => {
      console.log(`🔌 [RealtimeManager] ${context} unsubscribing from:`, subscriptionKey);
      
      const sub = this.activeSubscriptions.get(subscriptionKey);
      if (sub) {
        sub.callbacks.delete(callback);
        sub.subscriptionCount--;
        console.log(`📊 [RealtimeManager] Remaining callbacks for ${subscriptionKey}:`, sub.callbacks.size);

        // If no more callbacks, immediately cleanup the subscription
        if (sub.callbacks.size === 0) {
          console.log(`⏰ [RealtimeManager] No more callbacks for ${subscriptionKey}, marking for cleanup`);
          sub.lastActivity = Date.now();
          
          // Immediately unsubscribe and remove the channel to force fresh subscription next time
          console.log(`🧹 [RealtimeManager] Immediately cleaning up subscription: ${subscriptionKey}`);
          sub.channel.unsubscribe();
          this.supabase.removeChannel(sub.channel);
          this.activeSubscriptions.delete(subscriptionKey);
        }
      }
    };
  }

  subscribeToConversations(
    userId: string,
    callback: SubscriptionCallback,
    context: string
  ): () => void {
    const subscriptionKey = `conversations-${userId}`;
    
    console.log(`📡 [RealtimeManager] ${context} subscribing to conversations:`, subscriptionKey);

    let subscription = this.activeSubscriptions.get(subscriptionKey);

    // Check if existing subscription has a healthy channel
    if (subscription && !this.isChannelHealthy(subscription.channel)) {
      console.log(`🔄 [RealtimeManager] Existing conversation channel for ${subscriptionKey} is unhealthy, recreating...`);
      
      // Remove the unhealthy channel
      subscription.channel.unsubscribe();
      this.supabase.removeChannel(subscription.channel);
      this.activeSubscriptions.delete(subscriptionKey);
      subscription = null;
    }

    if (!subscription) {
      console.log(`🆕 [RealtimeManager] Creating new conversation subscription for:`, subscriptionKey);
      
      // Create new subscription with stable channel name (no timestamp)
      const channel = this.supabase
        .channel(`user-conversations-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
          (payload) => {
            console.log(`📨 [RealtimeManager] Conversation update (as receiver) for ${userId}:`, {
              from: payload.new.sender_id,
              messageText: payload.new.message_text?.substring(0, 30) + '...'
            });
            if (subscription) {
              subscription.lastActivity = Date.now();
              subscription.callbacks.forEach(cb => {
                try {
                  cb(payload);
                } catch (error) {
                  console.error(`❌ [RealtimeManager] Error in conversation callback:`, error);
                }
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
          (payload) => {
            console.log(`📤 [RealtimeManager] Conversation update (as sender) for ${userId}:`, {
              to: payload.new.receiver_id,
              messageText: payload.new.message_text?.substring(0, 30) + '...'
            });
            if (subscription) {
              subscription.lastActivity = Date.now();
              subscription.callbacks.forEach(cb => {
                try {
                  cb(payload);
                } catch (error) {
                  console.error(`❌ [RealtimeManager] Error in conversation callback:`, error);
                }
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
          (payload) => {
            if (subscription) {
              subscription.lastActivity = Date.now();
              subscription.callbacks.forEach(cb => {
                try {
                  cb(payload);
                } catch (error) {
                  console.error(`❌ [RealtimeManager] Error in conversation update callback:`, error);
                }
              });
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`🔌 [RealtimeManager] Conversation subscription ${subscriptionKey} status:`, status);
          if (err) {
            console.error(`❌ [RealtimeManager] Conversation subscription ${subscriptionKey} error:`, err);
          }
        });

      subscription = {
        channel,
        callbacks: new Set(),
        lastActivity: Date.now(),
        subscriptionCount: 0
      };

      this.activeSubscriptions.set(subscriptionKey, subscription);
    } else {
      console.log(`♻️ [RealtimeManager] Reusing existing conversation subscription for:`, subscriptionKey);
    }

    subscription.callbacks.add(callback);
    subscription.subscriptionCount++;
    subscription.lastActivity = Date.now();

    console.log(`✅ [RealtimeManager] ${context} subscribed to conversations. Active callbacks:`, subscription.callbacks.size);

    return () => {
      console.log(`🔌 [RealtimeManager] ${context} unsubscribing from conversations:`, subscriptionKey);
      
      const sub = this.activeSubscriptions.get(subscriptionKey);
      if (sub) {
        sub.callbacks.delete(callback);
        sub.subscriptionCount--;
        console.log(`📊 [RealtimeManager] Remaining conversation callbacks for ${subscriptionKey}:`, sub.callbacks.size);

        // If no more callbacks, immediately cleanup the subscription
        if (sub.callbacks.size === 0) {
          console.log(`⏰ [RealtimeManager] No more conversation callbacks for ${subscriptionKey}, marking for cleanup`);
          sub.lastActivity = Date.now();
          
          // Immediately unsubscribe and remove the channel to force fresh subscription next time
          console.log(`🧹 [RealtimeManager] Immediately cleaning up conversation subscription: ${subscriptionKey}`);
          sub.channel.unsubscribe();
          this.supabase.removeChannel(sub.channel);
          this.activeSubscriptions.delete(subscriptionKey);
        }
      }
    };
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  getSubscriptionStats(): { [key: string]: { callbackCount: number; subscriptionCount: number; lastActivity: string } } {
    const stats: { [key: string]: { callbackCount: number; subscriptionCount: number; lastActivity: string } } = {};
    
    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      stats[key] = {
        callbackCount: subscription.callbacks.size,
        subscriptionCount: subscription.subscriptionCount,
        lastActivity: new Date(subscription.lastActivity).toISOString()
      };
    }
    
    return stats;
  }

  // Method to manually check and refresh unhealthy channels
  refreshUnhealthyChannels(): void {
    console.log('🔍 [RealtimeManager] Checking all channels for health...');
    
    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      if (!this.isChannelHealthy(subscription.channel)) {
        console.log(`🚨 [RealtimeManager] Found unhealthy channel: ${key}, will recreate on next subscription`);
        
        // Mark for recreation by removing from active subscriptions
        // The next subscription attempt will recreate it
        subscription.channel.unsubscribe();
        this.supabase.removeChannel(subscription.channel);
        this.activeSubscriptions.delete(key);
      }
    }
  }

  destroy() {
    console.log('🧹 [RealtimeManager] Destroying all subscriptions');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      console.log(`🗑️ [RealtimeManager] Removing subscription:`, key);
      subscription.channel.unsubscribe();
      this.supabase.removeChannel(subscription.channel);
    }
    
    this.activeSubscriptions.clear();
  }
}

export default RealtimeManager;