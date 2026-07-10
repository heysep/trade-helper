export const OPINIONS = ['hold', 'watch', 'reduce', 'exit'] as const;
export type Opinion = (typeof OPINIONS)[number];
export const CHANGE_LEVELS = ['none', 'minor', 'major'] as const;
export type ChangeLevel = (typeof CHANGE_LEVELS)[number];

export interface Holding {
  id: string; user_id: string; ticker: string; market: 'KRX' | 'US';
  name: string; created_at: string;
}
export interface ReasonReview {
  reason: string; verdict: '타당' | '부분 타당' | '약함'; comment: string;
}
export interface SoundnessReview {
  soundness?: string;               // 구버전 호환 (통짜 텍스트)
  score?: number;                   // 합리성 점수 0~100 (AI 주관)
  summary?: string;                 // 한 줄 총평
  reason_reviews?: ReasonReview[];  // 매수 이유별 개별 판정
  missing_points?: string[];        // 놓친 관점
  counterpoints: string[];
  add_candidates?: string[];      // 추가매수 조건 후보 (채택용)
}
export interface Thesis {
  id: string; holding_id: string; user_id: string;
  buy_reason: string; break_conditions: string; add_conditions: string | null;
  target_horizon: string; soundness_review: SoundnessReview | null;
  status: 'active' | 'watching' | 'reduce' | 'exit' | 'closed';
  opened_at: string; closed_at: string | null; outcome: 'success' | 'fail' | null;
}
export interface CheckCondition {
  id: string; thesis_id: string; label: string;
  event_type: 'earnings' | 'guidance' | 'metric' | 'custom';
  next_check_date: string | null; status: 'open' | 'done';
  condition_state: 'ok' | 'warning' | 'broken';
  source: 'user' | 'ai';
  reason_label: string | null;   // 어느 논점에서 나온 항목인지
  state_note: string | null;     // 왜 정상/비정상인지 한 줄
}
export interface DailyScan {
  id: string; ticker: string; market: 'KRX' | 'US'; scan_date: string;
  summary: string; change_level: ChangeLevel; sources: string[];
}
export interface CheckResult {
  id: string; thesis_id: string; check_date: string;
  opinion: Opinion; rationale: string; scan_ref: string | null;
  add_signal: boolean;
}
