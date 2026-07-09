import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Thesis } from '@/types/db';

export function useTheses(holdingId?: string) {
  return useQuery({
    queryKey: ['theses', holdingId ?? 'all'],
    queryFn: async () => {
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
      const { data, error } = await supabase.from('theses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as unknown as Thesis;
    },
  });
}

export function useCloseThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { thesisId: string; outcome: 'success' | 'fail' }) => {
      const { data, error } = await supabase.from('theses')
        .update({ status: 'closed', outcome: input.outcome, closed_at: new Date().toISOString() })
        .eq('id', input.thesisId).select().single();
      if (error) throw error;
      return data as unknown as Thesis;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ['theses'] });
      qc.invalidateQueries({ queryKey: ['thesis', input.thesisId] });
      qc.invalidateQueries({ queryKey: ['stats'] });
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
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('theses')
        .insert({ ...input, user_id: userData.user!.id }).select().single();
      if (error) throw error;
      return data as unknown as Thesis;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['theses'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
}
