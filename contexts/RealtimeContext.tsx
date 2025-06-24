import { createContext, useContext, ReactNode, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type SubscribeConfig = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
};

type RealtimeCallback<T> = (payload: RealtimePostgresChangesPayload<T>) => void;

interface RealtimeContextValue {
  subscribe<T>(channel: string, config: SubscribeConfig, callback: RealtimeCallback<T>): () => void;
}

const defaultValue: RealtimeContextValue = {
  subscribe: () => () => {},
};

export const RealtimeContext = createContext<RealtimeContextValue>(defaultValue);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const counterRef = useRef(0);
  const isDev = process.env.NODE_ENV !== 'production';
  const log = (...args: any[]) => {
    if (isDev) console.log('[Realtime]', ...args);
  };

  const subscribe = <T,>(
    channelName: string,
    { event, schema = 'public', table, filter }: SubscribeConfig,
    callback: RealtimeCallback<T>
  ) => {
    const uniqueName = `${channelName}-${counterRef.current++}`;

    const channel = supabase
      .channel(uniqueName)
      .on('postgres_changes', { event, schema, table, filter }, (payload) => {
        log('event', uniqueName, payload);
        callback(payload);
      });

    log('subscribe', uniqueName, { event, schema, table, filter });
    channel.subscribe((status) => log('status', uniqueName, status));
    return () => {
      log('unsubscribe', uniqueName);
      supabase.removeChannel(channel);
    };
  };

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);

