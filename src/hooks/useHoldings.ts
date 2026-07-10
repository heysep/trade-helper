import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Holding } from '@/types/db';

export function useHoldings() {
  return useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Holding[];
    },
  });
}

export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ticker: string; market: 'KRX' | 'US'; name: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('holdings')
        .insert({ ...input, ticker: input.ticker.toUpperCase(), user_id: userData.user!.id })
        .select().single();
      if (error) {
        if (error.message.includes('FREE_PLAN_LIMIT')) throw new Error('무료 플랜은 종목 5개까지 등록할 수 있어요.');
        if (error.message.includes('duplicate key')) throw new Error('이미 등록된 종목이에요. 기존 가설에서 관리해 주세요.');
        throw new Error(error.message);
      }
      return data as unknown as Holding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  });
}
