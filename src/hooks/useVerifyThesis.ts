import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isMockMode, mockVerify } from '@/lib/mock';

export function useVerifyThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (thesisId: string) => {
      if (isMockMode()) return mockVerify(thesisId);
      const { data, error } = await supabase.functions.invoke('gpt-verify', { body: { thesis_id: thesisId } });
      if (error) throw new Error('검증 실패 — 잠시 후 다시 시도해 주세요.');
      return data as { soundness: string; counterpoints: string[] };
    },
    onSuccess: (_d, thesisId) => {
      qc.invalidateQueries({ queryKey: ['thesis', thesisId] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
    },
  });
}
