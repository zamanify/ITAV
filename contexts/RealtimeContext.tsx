import { createContext, useContext, ReactNode } from 'react';
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
  const subscribe = <T,>(
    channelName: string,
    { event, schema = 'public', table, filter }: SubscribeConfig,
    callback: RealtimeCallback<T>
  ) => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event, schema, table, filter }, callback);

    channel.subscribe();
    return () => {
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

