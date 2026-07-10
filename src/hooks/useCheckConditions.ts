import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CheckCondition } from '@/types/db';

export type CalendarItem = CheckCondition & { theses: { id: string; holdings: { ticker: string } } };

/** 가설 하나의 감시 항목 (상태 포함) */
export function useThesisConditions(thesisId: string) {
  return useQuery({
    queryKey: ['conditions', thesisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_conditions').select('*')
        .eq('thesis_id', thesisId).eq('status', 'open')
        .order('next_check_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as CheckCondition[];
    },
  });
}

/** 사용자가 직접 고른 감시 항목 추가 (재검증에도 보존됨) */
export function useAddUserConditions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ thesisId, labels }: { thesisId: string; labels: string[] }) => {
      if (!labels.length) return;
      const { error } = await supabase.from('check_conditions').insert(
        labels.map((label) => ({ thesis_id: thesisId, label, event_type: 'custom', source: 'user' })),
      );
      if (error) throw error;
    },
    onSuccess: (_d, { thesisId }) => {
      qc.invalidateQueries({ queryKey: ['conditions', thesisId] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
    },
  });
}

export function useCheckConditions() {
  return useQuery({
    queryKey: ['check_conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_conditions')
        .select('*, theses!inner(id, holdings!inner(ticker))')
        .eq('status', 'open')
        .not('next_check_date', 'is', null)
        .gte('next_check_date', new Date().toISOString().slice(0, 10))
        .order('next_check_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarItem[];
    },
  });
}
