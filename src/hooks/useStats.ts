import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Thesis } from '@/types/db';

export interface Stats {
  total: number; active: number; success: number; fail: number;
  avgHoldingDays: number | null; failedTheses: Thesis[];
}

export function computeStats(theses: Thesis[]): Stats {
  const closed = theses.filter((t) => t.closed_at);
  const days = closed.map((t) => (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 86400000);
  return {
    total: theses.length,
    active: theses.filter((t) => t.status !== 'closed').length,
    success: theses.filter((t) => t.outcome === 'success').length,
    fail: theses.filter((t) => t.outcome === 'fail').length,
    avgHoldingDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    failedTheses: theses.filter((t) => t.outcome === 'fail'),
  };
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theses').select('*');
      if (error) throw error;
      return computeStats((data ?? []) as unknown as Thesis[]);
    },
  });
}
