import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CheckResultItem } from './useCheckResults';

/**
 * 가설별 최신 점검 결과 (날짜 무관 — UTC 경계 문제 회피, 감사 H1/H2).
 * 홈 배지·점검 탭이 공유.
 */
export function useLatestResults() {
  return useQuery({
    queryKey: ['latest_results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_results')
        .select('*, theses!inner(id, status, holdings!inner(ticker, name))')
        .order('check_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      const latest = new Map<string, CheckResultItem>();
      for (const r of (data ?? []) as unknown as CheckResultItem[]) {
        if (!latest.has(r.thesis_id)) latest.set(r.thesis_id, r);
      }
      return latest; // thesis_id → 최신 결과
    },
  });
}
