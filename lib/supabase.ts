import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log realtime connection status to help debug websocket issues
supabase.realtime.on('open', () => {
  console.log('Realtime connection opened');
});
supabase.realtime.on('close', () => {
  console.log('Realtime connection closed');
});
supabase.realtime.on('error', (err) => {
  console.log('Realtime connection error', err);
});
