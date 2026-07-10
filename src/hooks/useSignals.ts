import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CheckResultItem } from './useCheckResults';

const LAST_SEEN_KEY = 'signals_last_seen';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** 최근 7일 행동 신호: 추가매수 달성 or 관점 흔들림(관찰/축소/청산) */
export function useSignals() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_results')
        .select('*, theses!inner(id, holdings!inner(ticker, name))')
        .gte('check_date', daysAgo(7))
        .or('add_signal.eq.true,opinion.neq.hold')
        .order('check_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CheckResultItem[];
    },
  });
}

/** 안 읽은 신호 수 + 읽음 처리 */
export function useSignalsUnread() {
  const { data: signals } = useSignals();
  const [lastSeen, setLastSeen] = useState<string>('');

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((v) => setLastSeen(v ?? ''));
  }, []);

  const unreadCount = (signals ?? []).filter((s) => s.check_date > lastSeen).length;

  const markSeen = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setLastSeen(today);
    AsyncStorage.setItem(LAST_SEEN_KEY, today);
  }, []);

  return { signals: signals ?? [], unreadCount, markSeen };
}
