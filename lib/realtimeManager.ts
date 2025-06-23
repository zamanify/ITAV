export type MessageCallback = () => void;

interface Subscription {
  channel: any;
  callbacks: Set<MessageCallback>;
}

import { supabase } from './supabase';

class RealtimeManager {
  private activeSubscriptions: Map<string, Subscription> = new Map();

  private isChannelHealthy(channel: any) {
    return channel.state === 'joined' || channel.state === 'joining';
  }

  private createMessageSubscriptionKey(userIdA: string, userIdB: string) {
    const ids = [userIdA, userIdB].sort();
    return `messages-${ids[0]}-${ids[1]}`;
  }

  subscribeToMessages(userIdA: string, userIdB: string, callback: MessageCallback) {
    const key = this.createMessageSubscriptionKey(userIdA, userIdB);
    let sub = this.activeSubscriptions.get(key);

    if (!sub || !this.isChannelHealthy(sub.channel)) {
      if (sub) {
        sub.channel.unsubscribe();
        supabase.removeChannel(sub.channel);
      }
      const filterA = `and=(sender_id.eq.${userIdA},receiver_id.eq.${userIdB})`;
      const filterB = `and=(sender_id.eq.${userIdB},receiver_id.eq.${userIdA})`;

      const channel = supabase
        .channel(`shared-${key}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: filterA }, () => this.invokeCallbacks(key))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: filterB }, () => this.invokeCallbacks(key))
        .subscribe();
      sub = { channel, callbacks: new Set() };
      this.activeSubscriptions.set(key, sub);
    }

    sub.callbacks.add(callback);

    return () => {
      const current = this.activeSubscriptions.get(key);
      if (!current) return;
      current.callbacks.delete(callback);
      if (current.callbacks.size === 0) {
        current.channel.unsubscribe();
        supabase.removeChannel(current.channel);
        this.activeSubscriptions.delete(key);
      }
    };
  }

  private invokeCallbacks(key: string) {
    const sub = this.activeSubscriptions.get(key);
    if (!sub) return;
    for (const cb of Array.from(sub.callbacks)) {
      try {
        cb();
      } catch (err) {
        console.error('Realtime callback error', err);
      }
    }
  }

  private createConversationKey(userId: string) {
    return `conversations-${userId}`;
  }

  subscribeToConversations(userId: string, callback: MessageCallback) {
    const key = this.createConversationKey(userId);
    let sub = this.activeSubscriptions.get(key);

    if (!sub || !this.isChannelHealthy(sub.channel)) {
      if (sub) {
        sub.channel.unsubscribe();
        supabase.removeChannel(sub.channel);
      }
      const channel = supabase
        .channel(`user-${key}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, () => this.invokeCallbacks(key))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, () => this.invokeCallbacks(key))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, () => this.invokeCallbacks(key))
        .subscribe();
      sub = { channel, callbacks: new Set() };
      this.activeSubscriptions.set(key, sub);
    }

    sub.callbacks.add(callback);

    return () => {
      const current = this.activeSubscriptions.get(key);
      if (!current) return;
      current.callbacks.delete(callback);
      if (current.callbacks.size === 0) {
        current.channel.unsubscribe();
        supabase.removeChannel(current.channel);
        this.activeSubscriptions.delete(key);
      }
    };
  }
}

export const realtimeManager = new RealtimeManager();