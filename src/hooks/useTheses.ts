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

export function useCloseThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { thesisId: string; outcome: 'success' | 'fail' }) => {
      const { data, error } = await supabase.from('theses')
        .update({ status: 'closed', outcome: input.outcome, closed_at: new Date().toISOString() })
        .eq('id', input.thesisId).select().single();
      if (error) throw error;
      // 감시 항목도 종료 — 캘린더/감시 목록에서 제거
      await supabase.from('check_conditions').update({ status: 'done' }).eq('thesis_id', input.thesisId).eq('status', 'open');
      return data as unknown as Thesis;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ['theses'] });
      qc.invalidateQueries({ queryKey: ['thesis', input.thesisId] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
      qc.invalidateQueries({ queryKey: ['conditions', input.thesisId] });
    },
  });
}

/** 가설 삭제 — 조건/결과는 FK cascade, 마지막 가설이면 종목도 정리 (5종목 슬롯 회수) */
export function useDeleteThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ thesisId, holdingId }: { thesisId: string; holdingId: string }) => {
      const { error } = await supabase.from('theses').delete().eq('id', thesisId);
      if (error) throw error;
      const { count } = await supabase.from('theses').select('id', { count: 'exact', head: true }).eq('holding_id', holdingId);
      if ((count ?? 0) === 0) {
        await supabase.from('holdings').delete().eq('id', holdingId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theses'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
      qc.invalidateQueries({ queryKey: ['check_results'] });
      qc.invalidateQueries({ queryKey: ['signals'] });
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
