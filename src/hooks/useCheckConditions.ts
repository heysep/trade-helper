import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CheckCondition } from '@/types/db';

export type CalendarItem = CheckCondition & { theses: { id: string; holdings: { ticker: string } } };

export function useCheckConditions() {
  return useQuery({
    queryKey: ['check_conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_conditions')
        .select('*, theses!inner(id, holdings!inner(ticker))')
        .eq('status', 'open')
        .not('next_check_date', 'is', null)
        .order('next_check_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarItem[];
    },
  });
}
