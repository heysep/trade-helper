import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { isMockMode } from '@/lib/mock';
import { colors, type, radius, space } from '@/theme';

export function toYahooSymbol(ticker: string, market: 'KRX' | 'US'): string {
  return market === 'KRX' ? `${ticker}.KS` : ticker;
}

export function buildLinePath(values: number[], width: number, height: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // flat series 보호
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${Math.round(i * step * 100) / 100},${Math.round(((max - v) / span) * height * 100) / 100}`)
    .join(' ');
}

// mock 모드용 결정적 시리즈 (ticker별 고정)
export function mockSeries(ticker: string): number[] {
  let seed = 0;
  for (const c of ticker) seed = (seed * 31 + c.charCodeAt(0)) % 997;
  const out: number[] = [];
  let v = 100 + (seed % 50);
  for (let i = 0; i < 60; i++) {
    seed = (seed * 137 + 71) % 997;
    v = Math.max(10, v + ((seed % 21) - 9) * 0.6);
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

async function fetchDailyCloses(ticker: string, market: 'KRX' | 'US'): Promise<number[]> {
  const symbol = toYahooSymbol(ticker, market);
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`);
  if (!res.ok) throw new Error(`chart ${res.status}`);
  const data = await res.json();
  const closes: (number | null)[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const values = closes.filter((v): v is number => typeof v === 'number');
  if (values.length < 2) throw new Error('no data');
  return values;
}

const CHART_W = 320;
const CHART_H = 120;

export function PriceChart({ ticker, market }: { ticker: string; market: 'KRX' | 'US' }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['chart', ticker, market],
    queryFn: () => (isMockMode() ? Promise.resolve(mockSeries(ticker)) : fetchDailyCloses(ticker, market)),
    staleTime: 1000 * 60 * 60, // 시세는 표시용 — 1시간 캐시
    retry: 1,
  });

  if (isLoading) {
    return <View style={{ height: 180, borderRadius: radius.lg, backgroundColor: colors.surfaceCardDark }} />;
  }
  if (isError || !data) {
    return (
      <View style={{ height: 60, borderRadius: radius.lg, backgroundColor: colors.surfaceCardDark, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[type.caption, { color: colors.muted }]}>차트 데이터를 불러오지 못했습니다</Text>
      </View>
    );
  }

  const last = data[data.length - 1];
  const first = data[0];
  const changePct = ((last - first) / first) * 100;
  const up = changePct >= 0;
  const lineColor = up ? colors.tradingUp : colors.tradingDown;
  const path = buildLinePath(data, CHART_W, CHART_H);
  const areaPath = `${path} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

  return (
    <View style={{ borderRadius: radius.lg, backgroundColor: colors.surfaceCardDark, padding: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space.sm }}>
        <Text style={[type.numberMd, { color: colors.onDark }]}>
          {market === 'KRX' ? last.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) : last.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </Text>
        <Text style={[type.numberSm, { color: lineColor }]}>
          {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}% (3M)
        </Text>
      </View>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#fill)" />
        <Path d={path} stroke={lineColor} strokeWidth="2" fill="none" />
      </Svg>
      <Text style={[type.caption, { color: colors.muted, marginTop: space.xs }]}>최근 3개월 · 일봉 종가 · 표시용</Text>
    </View>
  );
}
