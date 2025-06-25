import { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ConversationCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

export class RealtimeManager {
  private static instance: RealtimeManager;
  private counter = 0;
  private channels: Map<string, RealtimeChannel> = new Map();

  private constructor(private client: SupabaseClient) {}

  static getInstance(client: SupabaseClient = supabase) {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager(client);
    }
    return RealtimeManager.instance;
  }

  subscribeToConversations(userId: string, callback: ConversationCallback, channelPrefix = 'conv') {
    const channelName = `${channelPrefix}-${this.counter++}`;
    const channel = this.client
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, callback)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, callback)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, callback);

    channel.subscribe();
    this.channels.set(channelName, channel);

    return () => {
      this.client.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  getSubscriptionStats() {
    return { active: this.channels.size };
  }
}

export const realtimeManager = RealtimeManager.getInstance();
