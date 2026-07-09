export const OPINIONS = ['hold', 'watch', 'reduce', 'exit'] as const;
export type Opinion = (typeof OPINIONS)[number];
export const CHANGE_LEVELS = ['none', 'minor', 'major'] as const;
export type ChangeLevel = (typeof CHANGE_LEVELS)[number];

export interface Holding {
  id: string; user_id: string; ticker: string; market: 'KRX' | 'US';
  name: string; created_at: string;
}
export interface SoundnessReview {
  soundness: string; counterpoints: string[];
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
}
export interface DailyScan {
  id: string; ticker: string; market: 'KRX' | 'US'; scan_date: string;
  summary: string; change_level: ChangeLevel; sources: string[];
}
export interface CheckResult {
  id: string; thesis_id: string; check_date: string;
  opinion: Opinion; rationale: string; scan_ref: string | null;
}
