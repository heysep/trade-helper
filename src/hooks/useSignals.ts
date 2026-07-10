import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CheckResultItem } from './useCheckResults';

const LAST_SEEN_KEY = 'signals_last_seen_at';

type SignalRow = CheckResultItem & { created_at: string };

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SignalRow[];
    },
  });
}

/** 마지막으로 본 시각 — react-query 캐시로 전역 공유 (벨·알림 화면 동기화, 감사 M8) */
function useLastSeen() {
  const qc = useQueryClient();
  const { data: lastSeen } = useQuery({
    queryKey: ['signals_last_seen'],
    queryFn: async () => (await AsyncStorage.getItem(LAST_SEEN_KEY)) ?? '',
    staleTime: Infinity,
  });
  const setLastSeen = useCallback((ts: string) => {
    AsyncStorage.setItem(LAST_SEEN_KEY, ts);
    qc.setQueryData(['signals_last_seen'], ts);
  }, [qc]);
  return { lastSeen: lastSeen ?? '', setLastSeen };
}

/** 안 읽은 신호 수 + 읽음 처리 — created_at 타임스탬프 커서 (UTC 날짜 경계 문제 해결, 감사 H2) */
export function useSignalsUnread() {
  const { data: signals } = useSignals();
  const { lastSeen, setLastSeen } = useLastSeen();

  const unreadCount = (signals ?? []).filter((s) => (s.created_at ?? '') > lastSeen).length;

  const markSeen = useCallback(() => {
    const newest = signals?.[0]?.created_at ?? new Date().toISOString();
    setLastSeen(newest);
  }, [signals, setLastSeen]);

  return { signals: signals ?? [], unreadCount, markSeen };
}
