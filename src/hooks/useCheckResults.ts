import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isMockMode, MOCK } from '@/lib/mock';
import type { CheckResult } from '@/types/db';

export type CheckResultItem = CheckResult & { theses: { id: string; holdings: { ticker: string; name: string } } };

export function useCheckResults(date?: string) {
  const day = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['check_results', day],
    queryFn: async () => {
      if (isMockMode()) return MOCK.checkResults.filter((r) => r.check_date === day);
      const { data, error } = await supabase
        .from('check_results')
        .select('*, theses!inner(id, holdings!inner(ticker, name))')
        .eq('check_date', day)
        .order('opinion', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CheckResultItem[];
    },
  });
}
