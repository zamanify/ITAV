import { supabase } from './supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type MessageCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

class RealtimeManager {
  private static instance: RealtimeManager;

  private constructor(private client = supabase) {}

  static getInstance(client = supabase) {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager(client);
    }
    return RealtimeManager.instance;
  }

  subscribeToMessages(userIdA: string, userIdB: string, callback: MessageCallback) {
    const filterA = `sender_id=eq.${userIdA},receiver_id=eq.${userIdB}`;
    const filterB = `sender_id=eq.${userIdB},receiver_id=eq.${userIdA}`;
    const channel = this.client
      .channel(`shared-${userIdA}-${userIdB}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: filterA }, callback)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: filterB }, callback)
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }

  subscribeToConversations(userId: string, callback: MessageCallback) {
    const channel = this.client
      .channel(`user-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, callback)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, callback)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, callback)
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

export default RealtimeManager;
export const realtimeManager = RealtimeManager.getInstance();
