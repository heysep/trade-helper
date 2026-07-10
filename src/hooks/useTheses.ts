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

/** 내 가설 직접 수정 */
export function useUpdateThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ thesisId, fields }: {
      thesisId: string;
      fields: Partial<Pick<Thesis, 'buy_reason' | 'break_conditions' | 'add_conditions' | 'target_horizon'>>;
    }) => {
      const { error } = await supabase.from('theses').update(fields).eq('id', thesisId);
      if (error) throw error;
    },
    onSuccess: (_d, { thesisId }) => {
      qc.invalidateQueries({ queryKey: ['thesis', thesisId] });
      qc.invalidateQueries({ queryKey: ['theses'] });
    },
  });
}

/** AI 후보 채택: 깨지는 조건/추가매수 조건 텍스트에 한 줄 추가 */
export function useAppendThesisField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ thesisId, field, text, current }: {
      thesisId: string; field: 'break_conditions' | 'add_conditions'; text: string; current: string | null;
    }) => {
      const next = current && current.trim() ? `${current.trim()}\n${text}` : text;
      const { error } = await supabase.from('theses').update({ [field]: next }).eq('id', thesisId);
      if (error) throw error;
      return next;
    },
    onSuccess: (_d, { thesisId }) => qc.invalidateQueries({ queryKey: ['thesis', thesisId] }),
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
