import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SuggestResult {
  reasons: Array<{ text: string; watch_items: string[] }>;
  break_candidates: string[];
  add_candidates: string[];
}

/** 종목 기반 매수 논거·감시 항목·조건 후보 추천 (웹검색 1콜) */
export function useSuggest() {
  return useMutation({
    mutationFn: async (input: { name: string; ticker: string; market: 'KRX' | 'US' }) => {
      const { data, error } = await supabase.functions.invoke('gpt-suggest', { body: input });
      if (error) throw new Error('추천을 불러오지 못했어요 — 잠시 후 다시 시도해 주세요.');
      return data as SuggestResult;
    },
  });
}
