import { supabase } from './supabase';

export async function fetchPairBalance(userAId: string, userBId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('from_user,to_user,minutes')
    .or(`and(from_user.eq.${userAId},to_user.eq.${userBId}),and(from_user.eq.${userBId},to_user.eq.${userAId})`);

  if (error) {
    console.error('Failed to fetch transactions:', error);
    return null;
  }

  let balance = 0;
  for (const tx of data || []) {
    if (tx.from_user === userAId && tx.to_user === userBId) {
      balance -= tx.minutes;
    } else if (tx.from_user === userBId && tx.to_user === userAId) {
      balance += tx.minutes;
    }
  }
  return balance;
}
