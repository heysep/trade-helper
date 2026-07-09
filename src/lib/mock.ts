import type { CheckCondition, CheckResult, Holding, Thesis } from '@/types/db';

export function isMockMode(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): boolean {
  if (env.EXPO_PUBLIC_USE_MOCK === '1') return true;
  return !env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

const today = new Date();
const iso = (d: Date) => d.toISOString();
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const todayStr = day(0);
const U = 'mock-user';

const holdings: Holding[] = [
  { id: 'h-nvda', user_id: U, ticker: 'NVDA', market: 'US', name: '엔비디아', created_at: iso(new Date(today.getTime() - 90 * 864e5)) },
  { id: 'h-samsung', user_id: U, ticker: '005930', market: 'KRX', name: '삼성전자', created_at: iso(new Date(today.getTime() - 60 * 864e5)) },
  { id: 'h-tsla', user_id: U, ticker: 'TSLA', market: 'US', name: '테슬라', created_at: iso(new Date(today.getTime() - 30 * 864e5)) },
];

const theses: Thesis[] = [
  {
    id: 't-nvda', holding_id: 'h-nvda', user_id: U,
    buy_reason: 'AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유',
    break_conditions: '빅테크 CAPEX 가이던스 하향, 데이터센터 성장률 둔화, 경쟁사 점유율 급증',
    add_conditions: '실적 유지 + 주가 20% 조정 시', target_horizon: '2년',
    soundness_review: {
      soundness: '핵심 수요처(빅테크 CAPEX)와 매출 성장률을 확인 조건으로 잡은 구조는 논리적입니다. 다만 밸류에이션 수준과 경쟁사(ASIC 대체) 리스크에 대한 명시적 기준이 빠져 있습니다. 목표 기간 2년 대비 분기 단위 확인 지표가 잘 정의되어 있습니다.',
      counterpoints: ['핵심 고객의 자체 칩(ASIC) 전환 가속', 'CAPEX 사이클 피크아웃 후 주문 공백', '수출 규제 확대로 중국 매출 축소'],
    },
    status: 'active', opened_at: iso(new Date(today.getTime() - 90 * 864e5)), closed_at: null, outcome: null,
  },
  {
    id: 't-samsung', holding_id: 'h-samsung', user_id: U,
    buy_reason: 'HBM 공급 본격화와 메모리 업사이클이 겹치면 실적 레버리지가 크다',
    break_conditions: 'HBM 주요 고객 인증 실패, 메모리 가격 재하락',
    add_conditions: null, target_horizon: '1년',
    soundness_review: {
      soundness: '업사이클 + HBM 진입이라는 이중 동력은 타당하나, 인증 일정 지연 리스크가 가설의 최대 변수입니다. 확인 조건이 분기 실적에 집중되어 있어 월간 가격 지표 추가를 권합니다.',
      counterpoints: ['경쟁사 HBM 선점 고착화', '파운드리 적자 지속으로 전사 이익 희석'],
    },
    status: 'watching', opened_at: iso(new Date(today.getTime() - 60 * 864e5)), closed_at: null, outcome: null,
  },
  {
    id: 't-tsla', holding_id: 'h-tsla', user_id: U,
    buy_reason: 'FSD 라이선싱과 로보택시 상용화가 앞당겨지면 소프트웨어 마진 리레이팅',
    break_conditions: '로보택시 일정 연기, 차량 판매 마진 추가 하락',
    add_conditions: null, target_horizon: '3년',
    soundness_review: null,
    status: 'active', opened_at: iso(new Date(today.getTime() - 30 * 864e5)), closed_at: null, outcome: null,
  },
  {
    id: 't-closed-fail', holding_id: 'h-samsung', user_id: U,
    buy_reason: '턴어라운드 초입이라 판단해 저점 매수',
    break_conditions: '2개 분기 연속 영업이익 컨센서스 하회',
    add_conditions: null, target_horizon: '6개월',
    soundness_review: null,
    status: 'closed', opened_at: iso(new Date(today.getTime() - 200 * 864e5)), closed_at: iso(new Date(today.getTime() - 110 * 864e5)), outcome: 'fail',
  },
  {
    id: 't-closed-success', holding_id: 'h-nvda', user_id: U,
    buy_reason: '데이터센터 매출 서프라이즈 지속 구간 초입',
    break_conditions: '성장률 QoQ 둔화',
    add_conditions: null, target_horizon: '1년',
    soundness_review: null,
    status: 'closed', opened_at: iso(new Date(today.getTime() - 400 * 864e5)), closed_at: iso(new Date(today.getTime() - 120 * 864e5)), outcome: 'success',
  },
];

const checkConditions: (CheckCondition & { theses: { id: string; holdings: { ticker: string } } })[] = [
  { id: 'c1', thesis_id: 't-nvda', label: '2Q 실적 발표 (데이터센터 매출)', event_type: 'earnings', next_check_date: day(6), status: 'open', theses: { id: 't-nvda', holdings: { ticker: 'NVDA' } } },
  { id: 'c2', thesis_id: 't-nvda', label: '빅테크 CAPEX 가이던스 (MSFT/GOOGL)', event_type: 'guidance', next_check_date: day(12), status: 'open', theses: { id: 't-nvda', holdings: { ticker: 'NVDA' } } },
  { id: 'c3', thesis_id: 't-nvda', label: '경쟁사 점유율 리포트', event_type: 'metric', next_check_date: day(27), status: 'open', theses: { id: 't-nvda', holdings: { ticker: 'NVDA' } } },
  { id: 'c4', thesis_id: 't-samsung', label: 'HBM 고객 인증 뉴스 확인', event_type: 'custom', next_check_date: day(9), status: 'open', theses: { id: 't-samsung', holdings: { ticker: '005930' } } },
  { id: 'c5', thesis_id: 't-samsung', label: '분기 실적 발표', event_type: 'earnings', next_check_date: day(34), status: 'open', theses: { id: 't-samsung', holdings: { ticker: '005930' } } },
  { id: 'c6', thesis_id: 't-tsla', label: '로보택시 일정 업데이트', event_type: 'custom', next_check_date: day(45), status: 'open', theses: { id: 't-tsla', holdings: { ticker: 'TSLA' } } },
];

const checkResults: (CheckResult & { theses: { id: string; holdings: { ticker: string; name: string } } })[] = [
  {
    id: 'r1', thesis_id: 't-nvda', check_date: todayStr, opinion: 'hold',
    rationale: '오늘은 가설을 변경할 만한 새로운 정보가 없습니다. 다음 주요 확인일: 실적 발표.',
    scan_ref: null, theses: { id: 't-nvda', holdings: { ticker: 'NVDA', name: '엔비디아' } },
  },
  {
    id: 'r2', thesis_id: 't-samsung', check_date: todayStr, opinion: 'watch',
    rationale: 'HBM 인증 관련 일정 지연 보도가 있었습니다. 가설의 핵심 확인 조건과 직결되므로 다음 실적까지 관찰이 필요합니다.',
    scan_ref: null, theses: { id: 't-samsung', holdings: { ticker: '005930', name: '삼성전자' } },
  },
  {
    id: 'r3', thesis_id: 't-tsla', check_date: todayStr, opinion: 'reduce',
    rationale: '차량 판매 마진 추가 하락 신호가 나왔습니다. 가설의 깨지는 조건 일부가 충족되어 비중 관점 재검토 상황입니다.',
    scan_ref: null, theses: { id: 't-tsla', holdings: { ticker: 'TSLA', name: '테슬라' } },
  },
];

export const MOCK = { holdings, theses, checkConditions, checkResults };

// in-memory mutations (mock 모드 전용)
let seq = 0;
export function mockAddHolding(input: { ticker: string; market: 'KRX' | 'US'; name: string }): Holding {
  const h: Holding = { id: `h-new-${++seq}`, user_id: U, ticker: input.ticker.toUpperCase(), market: input.market, name: input.name, created_at: iso(new Date()) };
  holdings.unshift(h);
  return h;
}
export function mockAddThesis(input: { holding_id: string; buy_reason: string; break_conditions: string; add_conditions: string | null; target_horizon: string }): Thesis {
  const t: Thesis = { id: `t-new-${++seq}`, user_id: U, soundness_review: null, status: 'active', opened_at: iso(new Date()), closed_at: null, outcome: null, ...input };
  theses.unshift(t);
  return t;
}
export function mockVerify(thesisId: string): { soundness: string; counterpoints: string[] } {
  const review = {
    soundness: '(미리보기) 가설의 인과 구조는 명확하나, 깨지는 조건에 정량 기준(수치·기간)을 추가하면 점검 정확도가 올라갑니다.',
    counterpoints: ['핵심 지표가 예상보다 늦게 확인될 가능성', '거시 변수(금리·환율)로 인한 일시적 노이즈'],
  };
  const t = theses.find((x) => x.id === thesisId);
  if (t) t.soundness_review = review;
  checkConditions.push({
    id: `c-new-${++seq}`, thesis_id: thesisId, label: '다음 분기 실적 발표', event_type: 'earnings',
    next_check_date: day(30), status: 'open',
    theses: { id: thesisId, holdings: { ticker: holdings.find((h) => h.id === t?.holding_id)?.ticker ?? '' } },
  });
  return review;
}
