import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReasonReview } from '@/types/db';

export interface VerifyResult {
  score: number;
  summary: string;
  reason_reviews: ReasonReview[];
  missing_points: string[];
  counterpoints: string[];
  check_conditions: Array<{ label: string; event_type: string; next_check_date: string | null }>;
}

async function invokeVerify(body: Record<string, unknown>): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke('gpt-verify', { body });
  if (error) throw new Error('점검 실패 — 잠시 후 다시 시도해 주세요.');
  return data as VerifyResult;
}

/** 첫 점검: 바로 저장 */
export function useVerifyThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (thesisId: string) => invokeVerify({ thesis_id: thesisId }),
    onSuccess: (_d, thesisId) => {
      qc.invalidateQueries({ queryKey: ['thesis', thesisId] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
    },
  });
}

/** 재점검 미리보기: 저장하지 않고 결과만 받음 */
export function usePreviewVerify() {
  return useMutation({
    mutationFn: (thesisId: string) => invokeVerify({ thesis_id: thesisId, save: false }),
  });
}

/** 미리보기 결과로 덮어쓰기 확정 (GPT 재호출 없음) */
export function useApplyVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, result }: { thesisId: string; result: VerifyResult }) =>
      invokeVerify({ thesis_id: thesisId, apply: result }),
    onSuccess: (_d, { thesisId }) => {
      qc.invalidateQueries({ queryKey: ['thesis', thesisId] });
      qc.invalidateQueries({ queryKey: ['check_conditions'] });
    },
  });
}
