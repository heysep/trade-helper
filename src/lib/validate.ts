export function validateThesisInput(i: { buy_reason: string; break_conditions: string; target_horizon: string }): string | null {
  if (!i.buy_reason.trim()) return '매수 이유를 입력해 주세요.';
  if (!i.break_conditions.trim()) return '가설이 깨지는 조건을 입력해 주세요.';
  if (!i.target_horizon.trim()) return '목표 보유 기간을 입력해 주세요.';
  return null;
}
