import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isMockMode, MOCK, mockAddThesis } from '@/lib/mock';
import type { Thesis } from '@/types/db';

export function useTheses(holdingId?: string) {
  return useQuery({
    queryKey: ['theses', holdingId ?? 'all'],
    queryFn: async () => {
      if (isMockMode()) return MOCK.theses.filter((t) => !holdingId || t.holding_id === holdingId);
      let q = supabase.from('theses').select('*').order('opened_at', { ascending: false });
      if (holdingId) q = q.eq('holding_id', holdingId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Thesis[];
    },
  });
}

export function useThesis(id: string) {
  return useQuery({
    queryKey: ['thesis', id],
    queryFn: async () => {
      if (isMockMode()) {
        const t = MOCK.theses.find((x) => x.id === id);
        if (!t) throw new Error('not found');
        return { ...t };
      }
      const { data, error } = await supabase.from('theses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as unknown as Thesis;
    },
  });
}

export function useAddThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      holding_id: string; buy_reason: string; break_conditions: string;
      add_conditions: string | null; target_horizon: string;
    }) => {
      if (isMockMode()) return mockAddThesis(input);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('theses')
        .insert({ ...input, user_id: userData.user!.id }).select().single();
      if (error) throw error;
      return data as unknown as Thesis;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['theses'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
}
