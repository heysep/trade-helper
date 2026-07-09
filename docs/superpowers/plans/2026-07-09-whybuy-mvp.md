# WhyBuy (왜샀나) MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 투자 가설을 등록하면 GPT가 합당성을 검증하고, 확인 일정을 캘린더로 보여주고, 하루 1회 자동 점검(유지/관찰/축소/청산)해주는 Expo RN 앱 + Supabase 백엔드.

**Architecture:** Expo(React Native, expo-router) 앱이 Supabase(Auth·Postgres·Edge Functions·pg_cron)에 연결. GPT 호출은 전부 Edge Function에서만(OpenAI Responses API + web_search). 데일리 점검은 2단계: Stage1 종목당 1회 웹검색 스캔(공유 캐시) → Stage2 가설당 저가모델 평가(변화없음이면 GPT 미호출).

**Tech Stack:** Expo SDK (latest), TypeScript, expo-router, @tanstack/react-query, @supabase/supabase-js, react-native-webview(TradingView 위젯), expo-notifications, Deno(Edge Functions), jest-expo + @testing-library/react-native, deno test.

## Global Constraints

- 폰트: **Inter**(본문/디스플레이) + **IBM Plex Mono**(숫자) — BinanceNova/BinancePlex 절대 사용 금지.
- 브랜드 액센트: `#F5B301` (Signal Gold) — `#FCD535` 사용 금지.
- "Binance", "SAFU" 등 Binance 상표·카피 문자열 코드/카피 어디에도 금지.
- 앱 이름: **WhyBuy / 왜샀나** — 반드시 `src/constants/brand.ts` 한 곳에서만 정의.
- 카피 톤: "매수/매도하세요" 금지 → "가설 대비 변화 있음/없음" 서술. 면책 문구 상수 `DISCLAIMER` 사용.
- OpenAI API 키는 Edge Function 환경변수(`OPENAI_API_KEY`)에만. 클라이언트 코드에 절대 금지.
- 숫자 표기: IBM Plex Mono + `fontVariant: ['tabular-nums']`.
- trading-up `#0ecb81` / trading-down `#f6465d`는 텍스트/배지 색으로만, 카드 배경 금지.
- 무료 플랜 종목 상한 5개 (DB 트리거로 강제).
- 각 태스크 끝날 때 커밋. 커밋 트레일러: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 테스트: 앱은 `npm test`(jest-expo), Edge Functions는 `deno test --allow-env supabase/functions/tests/`.
- 타입체크: `npx tsc --noEmit` 통과 유지.

## File Structure (최종 형태)

```
/Users/im-yoseb/trade-helper/
├── app/                          # expo-router
│   ├── _layout.tsx               # 폰트로드 + QueryClient + Session provider
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 하단 탭 4개 (종목/일정/점검/히스토리)
│   │   ├── index.tsx             # 종목 목록
│   │   ├── calendar.tsx          # 확인 일정
│   │   ├── checks.tsx            # 데일리 점검 결과
│   │   └── history.tsx           # 히스토리·통계
│   ├── holding/new.tsx           # 종목 추가 (light)
│   ├── thesis/new.tsx            # 가설 등록 (light)
│   └── thesis/[id].tsx           # 가설 상세 + 검증 결과
├── src/
│   ├── constants/brand.ts        # 이름/면책/카피
│   ├── theme/{colors,typography,spacing,index}.ts
│   ├── components/{PrimaryButton,StatusBadge,Card,TextField,TVChart,HoldingCard,CheckResultCard,CalendarRow,StatCallout}.tsx
│   ├── lib/supabase.ts           # 클라이언트 (env)
│   ├── lib/session.tsx           # 익명 세션 provider
│   ├── hooks/{useHoldings,useTheses,useCheckConditions,useCheckResults,useStats}.ts
│   └── types/db.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql         # 테이블+RLS+트리거
│   │   └── 0002_cron.sql         # pg_cron 스케줄 (배포시 치환)
│   └── functions/
│       ├── _shared/openai.ts     # Responses API 래퍼
│       ├── gpt-verify/index.ts
│       ├── daily-batch/index.ts  # Stage1+Stage2 오케스트레이션
│       └── tests/{openai_test.ts,verify_test.ts,batch_test.ts}
├── __tests__/                    # 앱 단위 테스트
└── docs/superpowers/{specs,plans}/
```

---

### Task 1: Expo 스캐폴드 + 테스트 러너

**Files:**
- Create: Expo 기본 템플릿 전체 (`app/`, `package.json`, `tsconfig.json`, `app.json` 등)
- Modify: `package.json` (jest 설정), `app.json` (이름)
- Test: `__tests__/smoke.test.ts`

**Interfaces:**
- Produces: 동작하는 Expo TS 프로젝트, `npm test`·`npx tsc --noEmit` 그린.

- [x] **Step 1: 스캐폴드 생성 (비어있지 않은 repo라 tmp 경유)**

```bash
cd /Users/im-yoseb/trade-helper
npx create-expo-app@latest whybuy-tmp --template default --no-install
rsync -a whybuy-tmp/ ./ && rm -rf whybuy-tmp
npm install
```

- [x] **Step 2: 템플릿 예제 정리 + 앱 이름**

`app.json`의 `name`/`slug`를 `WhyBuy`/`whybuy`로 변경. 템플릿의 예제 화면(`app/(tabs)/explore.tsx` 등 데모 콘텐츠)은 남겨두되 Task 7에서 교체 예정이므로 지금은 빌드만 통과시킨다.

- [x] **Step 3: 테스트 러너 설치**

```bash
npx expo install jest-expo jest @types/jest -- --save-dev
npm install --save-dev @testing-library/react-native
```

`package.json`에 추가:

```json
"scripts": { "test": "jest" },
"jest": { "preset": "jest-expo", "transformIgnorePatterns": ["node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@tanstack/.*)/)"] }
```

- [x] **Step 4: 스모크 테스트 작성 + 실행**

```ts
// __tests__/smoke.test.ts
describe('project', () => {
  it('runs jest', () => { expect(1 + 1).toBe(2); });
});
```

Run: `npm test` → PASS. Run: `npx tsc --noEmit` → 에러 0.

- [x] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Expo TypeScript app with jest-expo"
```

---

### Task 2: 브랜드 상수 + 디자인 토큰 + 폰트

**Files:**
- Create: `src/constants/brand.ts`, `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/spacing.ts`, `src/theme/index.ts`
- Modify: `app/_layout.tsx` (폰트 로드)
- Test: `__tests__/theme.test.ts`

**Interfaces:**
- Produces: `BRAND = { appName: 'WhyBuy', appNameKo: '왜샀나' }`, `DISCLAIMER: string`, `colors.{primary,canvasDark,surfaceCardDark,...}`, `type.{heroDisplay,...}: TextStyle`, `space.{xxs..section}: number`, `radius.{xs..pill}: number`, `fontFamilies = { sans: 'Inter_400Regular', ... }`.

- [x] **Step 1: 실패 테스트 작성**

```ts
// __tests__/theme.test.ts
import { colors, type, space, radius } from '../src/theme';
import { BRAND, DISCLAIMER } from '../src/constants/brand';

describe('design tokens', () => {
  it('uses service-safe accent, not Binance yellow', () => {
    expect(colors.primary.toLowerCase()).toBe('#f5b301');
    const all = JSON.stringify(colors).toLowerCase();
    expect(all).not.toContain('#fcd535');
  });
  it('has dual canvas + trading semantics', () => {
    expect(colors.canvasDark).toBe('#0b0e11');
    expect(colors.tradingUp).toBe('#0ecb81');
    expect(colors.tradingDown).toBe('#f6465d');
    expect(colors.statusWatch).toBe(colors.primary);
  });
  it('numbers use IBM Plex Mono with tabular figures', () => {
    expect(type.numberMd.fontFamily).toContain('IBMPlexMono');
    expect(type.numberMd.fontVariant).toContain('tabular-nums');
    expect(type.bodyMd.fontFamily).toContain('Inter');
  });
  it('spacing/radius scales', () => {
    expect(space.section).toBe(56);
    expect(radius.md).toBe(6);
    expect(radius.pill).toBe(9999);
  });
  it('brand is centralized and disclaimer exists', () => {
    expect(BRAND.appName).toBe('WhyBuy');
    expect(BRAND.appNameKo).toBe('왜샀나');
    expect(DISCLAIMER.length).toBeGreaterThan(10);
  });
});
```

- [x] **Step 2: 실행 → FAIL 확인** (`npm test` — module not found)

- [x] **Step 3: 구현**

```ts
// src/constants/brand.ts
export const BRAND = { appName: 'WhyBuy', appNameKo: '왜샀나' } as const;
export const DISCLAIMER =
  '본 앱은 투자 판단을 기록·보조하는 도구이며 투자 자문이 아닙니다. 모든 투자 결정과 책임은 사용자 본인에게 있습니다.';
```

```ts
// src/theme/colors.ts
export const colors = {
  primary: '#F5B301', primaryActive: '#D99A00', primaryDisabled: '#3a3320', onPrimary: '#17191c',
  canvasDark: '#0b0e11', surfaceCardDark: '#1e2329', surfaceElevatedDark: '#2b3139',
  canvasLight: '#ffffff', surfaceSoftLight: '#fafafa', surfaceStrongLight: '#f5f5f5',
  hairlineOnDark: '#2b3139', hairlineOnLight: '#eaecef', borderStrong: '#cdd1d6',
  ink: '#181a20', body: '#eaecef', bodyOnLight: '#181a20', muted: '#707a8a', mutedStrong: '#929aa5', onDark: '#ffffff',
  tradingUp: '#0ecb81', tradingDown: '#f6465d',
  statusHold: '#0ecb81', statusWatch: '#F5B301', statusReduce: '#f6b73c', statusExit: '#f6465d',
  info: '#3b82f6', infoRing: '#3b82f6',
} as const;
```

```ts
// src/theme/typography.ts
import type { TextStyle } from 'react-native';
export const fontFamilies = {
  sans: 'Inter_400Regular', sansMedium: 'Inter_500Medium', sansSemiBold: 'Inter_600SemiBold', sansBold: 'Inter_700Bold',
  mono: 'IBMPlexMono_500Medium', monoBold: 'IBMPlexMono_700Bold',
} as const;
const t = (s: Partial<TextStyle>): TextStyle => s as TextStyle;
export const type = {
  heroDisplay: t({ fontFamily: fontFamilies.sansBold, fontSize: 34, lineHeight: 39, letterSpacing: -0.5 }),
  displayLg: t({ fontFamily: fontFamilies.sansBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 }),
  displayMd: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 24, lineHeight: 29 }),
  displaySm: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 20, lineHeight: 25 }),
  titleLg: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 18, lineHeight: 23 }),
  titleMd: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 16, lineHeight: 22 }),
  titleSm: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 14, lineHeight: 20 }),
  numberDisplay: t({ fontFamily: fontFamilies.monoBold, fontSize: 32, lineHeight: 35, letterSpacing: -0.3, fontVariant: ['tabular-nums'] }),
  numberMd: t({ fontFamily: fontFamilies.mono, fontSize: 15, lineHeight: 21, fontVariant: ['tabular-nums'] }),
  numberSm: t({ fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }),
  bodyMd: t({ fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 21 }),
  bodySm: t({ fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 19 }),
  caption: t({ fontFamily: fontFamilies.sansMedium, fontSize: 12, lineHeight: 17 }),
  button: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 15, lineHeight: 15 }),
  navLink: t({ fontFamily: fontFamilies.sansMedium, fontSize: 12, lineHeight: 16 }),
} as const;
```

```ts
// src/theme/spacing.ts
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, section: 56 } as const;
export const radius = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12, pill: 9999 } as const;
```

```ts
// src/theme/index.ts
export { colors } from './colors';
export { type, fontFamilies } from './typography';
export { space, radius } from './spacing';
```

- [x] **Step 4: 폰트 설치 + 루트 레이아웃 로드**

```bash
npx expo install expo-font @expo-google-fonts/inter @expo-google-fonts/ibm-plex-mono expo-splash-screen
```

`app/_layout.tsx`를 다음으로 교체:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    IBMPlexMono_500Medium, IBMPlexMono_700Bold,
  });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvasDark }, headerTintColor: colors.onDark, contentStyle: { backgroundColor: colors.canvasDark } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

- [x] **Step 5: 테스트/타입체크 → PASS 확인 후 Commit**

```bash
npm test && npx tsc --noEmit
git add -A && git commit -m "feat: add brand constants, design tokens, and font loading"
```

---

### Task 3: 코어 UI 컴포넌트

**Files:**
- Create: `src/components/PrimaryButton.tsx`, `src/components/StatusBadge.tsx`, `src/components/Card.tsx`, `src/components/TextField.tsx`
- Test: `__tests__/components.test.tsx`

**Interfaces:**
- Consumes: `src/theme`
- Produces:
  - `PrimaryButton({ title, onPress, disabled?, pill? })`
  - `StatusBadge({ status: 'hold'|'watch'|'reduce'|'exit' })` — 라벨 유지/관찰/축소/청산
  - `Card({ children, mode?: 'dark'|'light', style? })`
  - `TextField({ label, value, onChangeText, placeholder?, multiline? })` — light 폼용

- [x] **Step 1: 실패 테스트 작성**

```tsx
// __tests__/components.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { StatusBadge, STATUS_LABEL } from '../src/components/StatusBadge';
import { TextField } from '../src/components/TextField';

describe('PrimaryButton', () => {
  it('fires onPress, not when disabled', () => {
    const fn = jest.fn();
    const { getByText, rerender } = render(<PrimaryButton title="확인" onPress={fn} />);
    fireEvent.press(getByText('확인'));
    expect(fn).toHaveBeenCalledTimes(1);
    rerender(<PrimaryButton title="확인" onPress={fn} disabled />);
    fireEvent.press(getByText('확인'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBadge', () => {
  it('maps status to Korean label', () => {
    expect(STATUS_LABEL.hold).toBe('유지');
    expect(STATUS_LABEL.exit).toBe('청산');
    const { getByText } = render(<StatusBadge status="watch" />);
    expect(getByText('관찰')).toBeTruthy();
  });
});

describe('TextField', () => {
  it('propagates text changes', () => {
    const fn = jest.fn();
    const { getByPlaceholderText } = render(<TextField label="가설" value="" onChangeText={fn} placeholder="입력" />);
    fireEvent.changeText(getByPlaceholderText('입력'), 'abc');
    expect(fn).toHaveBeenCalledWith('abc');
  });
});
```

- [x] **Step 2: 실행 → FAIL 확인**

- [x] **Step 3: 구현**

```tsx
// src/components/PrimaryButton.tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, type, radius } from '../theme';

export function PrimaryButton({ title, onPress, disabled, pill }: {
  title: string; onPress: () => void; disabled?: boolean; pill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: pill ? radius.pill : radius.md },
        pressed && !disabled && { backgroundColor: colors.primaryActive },
        disabled && { backgroundColor: colors.primaryDisabled },
      ]}
    >
      <Text style={[type.button, { color: disabled ? colors.muted : colors.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: { backgroundColor: colors.primary, height: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
});
```

```tsx
// src/components/StatusBadge.tsx
import { View, Text } from 'react-native';
import { colors, type, radius } from '../theme';

export type Opinion = 'hold' | 'watch' | 'reduce' | 'exit';
export const STATUS_LABEL: Record<Opinion, string> = { hold: '유지', watch: '관찰', reduce: '축소', exit: '청산' };
const STATUS_COLOR: Record<Opinion, string> = {
  hold: colors.statusHold, watch: colors.statusWatch, reduce: colors.statusReduce, exit: colors.statusExit,
};

export function StatusBadge({ status }: { status: Opinion }) {
  const c = STATUS_COLOR[status];
  return (
    <View style={{ backgroundColor: c + '1F', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={[type.titleSm, { color: c }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}
```

```tsx
// src/components/Card.tsx
import { View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, space } from '../theme';

export function Card({ children, mode = 'dark', style }: {
  children: React.ReactNode; mode?: 'dark' | 'light'; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{
      backgroundColor: mode === 'dark' ? colors.surfaceCardDark : colors.canvasLight,
      borderRadius: radius.xl, padding: space.lg,
      ...(mode === 'light' ? { borderWidth: 1, borderColor: colors.hairlineOnLight } : {}),
    }, style]}>
      {children}
    </View>
  );
}
```

```tsx
// src/components/TextField.tsx
import { View, Text, TextInput } from 'react-native';
import { colors, type, radius, space } from '../theme';

export function TextField({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[type.bodyMd, {
          backgroundColor: colors.canvasLight, color: colors.ink, borderWidth: 1, borderColor: colors.hairlineOnLight,
          borderRadius: radius.md, paddingHorizontal: 16, minHeight: multiline ? 96 : 48, textAlignVertical: multiline ? 'top' : 'center',
        }]}
      />
    </View>
  );
}
```

- [x] **Step 4: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 5: Commit** — `git add -A && git commit -m "feat: add core UI components (button, badge, card, textfield)"`

---

### Task 4: DB 타입 + 스키마 마이그레이션

**Files:**
- Create: `src/types/db.ts`, `supabase/migrations/0001_init.sql`, `supabase/config.toml`(CLI init 산출)
- Test: `__tests__/dbtypes.test.ts` (타입 상수 스모크)

**Interfaces:**
- Produces: TS 타입 `Holding`, `Thesis`, `CheckCondition`, `DailyScan`, `CheckResult`, `Opinion`, `ChangeLevel` — 이후 모든 훅·엣지펑션이 이 이름을 쓴다. DB 테이블: `profiles, holdings, theses, check_conditions, daily_scans, check_results, usage_daily`.

- [x] **Step 1: 실패 테스트**

```ts
// __tests__/dbtypes.test.ts
import { OPINIONS, CHANGE_LEVELS } from '../src/types/db';
it('domain enums', () => {
  expect(OPINIONS).toEqual(['hold', 'watch', 'reduce', 'exit']);
  expect(CHANGE_LEVELS).toEqual(['none', 'minor', 'major']);
});
```

- [x] **Step 2: 실행 → FAIL**

- [x] **Step 3: 타입 구현**

```ts
// src/types/db.ts
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
```

- [x] **Step 4: Supabase CLI init + 마이그레이션 SQL**

```bash
brew list supabase >/dev/null 2>&1 || brew install supabase/tap/supabase
supabase init
mkdir -p supabase/migrations
```

```sql
-- supabase/migrations/0001_init.sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','paid')),
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  market text not null check (market in ('KRX','US')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ticker, market)
);

create table public.theses (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  buy_reason text not null,
  break_conditions text not null,
  add_conditions text,
  target_horizon text not null,
  soundness_review jsonb,
  status text not null default 'active' check (status in ('active','watching','reduce','exit','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome text check (outcome in ('success','fail'))
);

create table public.check_conditions (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses(id) on delete cascade,
  label text not null,
  event_type text not null check (event_type in ('earnings','guidance','metric','custom')),
  next_check_date date,
  status text not null default 'open' check (status in ('open','done'))
);

create table public.daily_scans (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  market text not null check (market in ('KRX','US')),
  scan_date date not null,
  summary text not null,
  change_level text not null check (change_level in ('none','minor','major')),
  sources jsonb not null default '[]',
  unique (ticker, market, scan_date)
);

create table public.check_results (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses(id) on delete cascade,
  check_date date not null,
  opinion text not null check (opinion in ('hold','watch','reduce','exit')),
  rationale text not null,
  scan_ref uuid references public.daily_scans(id),
  unique (thesis_id, check_date)
);

create table public.usage_daily (
  usage_date date primary key,
  web_search_calls int not null default 0,
  eval_calls int not null default 0
);

-- free plan: max 5 holdings
create or replace function public.enforce_holding_limit()
returns trigger language plpgsql security definer as $$
declare cnt int; user_plan text;
begin
  select coalesce(p.plan, 'free') into user_plan from public.profiles p where p.id = new.user_id;
  if user_plan = 'free' then
    select count(*) into cnt from public.holdings where user_id = new.user_id;
    if cnt >= 5 then
      raise exception 'FREE_PLAN_LIMIT: free plan allows up to 5 holdings';
    end if;
  end if;
  return new;
end $$;
create trigger holdings_limit before insert on public.holdings
  for each row execute function public.enforce_holding_limit();

-- auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.holdings enable row level security;
alter table public.theses enable row level security;
alter table public.check_conditions enable row level security;
alter table public.daily_scans enable row level security;
alter table public.check_results enable row level security;
alter table public.usage_daily enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own holdings" on public.holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own theses" on public.theses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conditions" on public.check_conditions for all
  using (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()));
create policy "scans readable" on public.daily_scans for select to authenticated using (true);
create policy "own results" on public.check_results for select
  using (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()));
-- daily_scans/check_results/usage_daily 쓰기는 service role 전용 (Edge Function)
```

- [x] **Step 5: 테스트/타입체크 → PASS, Commit**

```bash
npm test && npx tsc --noEmit
git add -A && git commit -m "feat: add DB types and Supabase schema migration (RLS, free-plan limit)"
```

---

### Task 5: Supabase 클라이언트 + 익명 세션

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/session.tsx`, `.env.example`
- Modify: `app/_layout.tsx` (Provider 래핑), `.gitignore` (`.env` 확인)
- Test: `__tests__/supabase.test.ts`

**Interfaces:**
- Consumes: env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Produces: `supabase` 싱글턴, `<SessionProvider>` + `useSession(): { userId: string | null, ready: boolean }`. 세션 없으면 `signInAnonymously()` 자동. (Supabase 대시보드에서 Anonymous provider 활성화 필요 — README에 기록)

- [x] **Step 1: 설치**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill @tanstack/react-query
```

- [x] **Step 2: 실패 테스트**

```ts
// __tests__/supabase.test.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { getSupabaseConfig } from '../src/lib/supabase';

it('throws clear error when env missing', () => {
  expect(() => getSupabaseConfig({})).toThrow('SUPABASE env missing');
});
it('reads env', () => {
  const cfg = getSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' });
  expect(cfg.url).toBe('https://x.supabase.co');
});
```

- [x] **Step 3: 실행 → FAIL. 구현:**

```ts
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export function getSupabaseConfig(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('SUPABASE env missing: set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  return { url, anonKey };
}

const cfg = (() => { try { return getSupabaseConfig(); } catch { return null; } })();
export const supabase = cfg
  ? createClient(cfg.url, cfg.anonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : (null as unknown as ReturnType<typeof createClient>);
```

```tsx
// src/lib/session.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const Ctx = createContext<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
  useEffect(() => {
    if (!supabase) { setState({ userId: null, ready: true }); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        setState({ userId: error ? null : data.session?.user.id ?? null, ready: true });
      } else {
        setState({ userId: session.user.id, ready: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setState((prev) => ({ ...prev, userId: s?.user.id ?? null }));
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
```

`app/_layout.tsx` 반환부를 Provider로 감싼다:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '../src/lib/session';
const queryClient = new QueryClient();
// ... RootLayout 안 return:
return (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
      <Stack screenOptions={{ /* 기존 그대로 */ }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  </QueryClientProvider>
);
```

`.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

- [x] **Step 4: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 5: Commit** — `git add -A && git commit -m "feat: add Supabase client, anonymous session provider, react-query"`

---

### Task 6: 데이터 훅 (React Query)

**Files:**
- Create: `src/hooks/useHoldings.ts`, `src/hooks/useTheses.ts`, `src/hooks/useCheckConditions.ts`, `src/hooks/useCheckResults.ts`, `src/hooks/useStats.ts`
- Test: `__tests__/useStats.test.ts` (통계 로직은 순수함수라 직접 테스트)

**Interfaces:**
- Consumes: `supabase`, `src/types/db.ts`
- Produces:
  - `useHoldings(): UseQueryResult<Holding[]>` / `useAddHolding(): UseMutationResult` (insert `{ticker, market, name}`)
  - `useTheses(holdingId?: string)` / `useThesis(id: string)` / `useAddThesis()` (insert 후 `id` 반환)
  - `useCheckConditions(): UseQueryResult<(CheckCondition & { thesis: { id: string; holding: { ticker: string } } })[]>` — 날짜순
  - `useCheckResults(date?: string)` — 오늘 기본
  - `computeStats(theses: Thesis[]): Stats` + `useStats()`, `Stats = { total, active, success, fail, avgHoldingDays, failedTheses: Thesis[] }`

- [x] **Step 1: 실패 테스트 (computeStats)**

```ts
// __tests__/useStats.test.ts
import { computeStats } from '../src/hooks/useStats';
import type { Thesis } from '../src/types/db';

const t = (over: Partial<Thesis>): Thesis => ({
  id: 'x', holding_id: 'h', user_id: 'u', buy_reason: 'r', break_conditions: 'b',
  add_conditions: null, target_horizon: '1y', soundness_review: null,
  status: 'active', opened_at: '2026-01-01T00:00:00Z', closed_at: null, outcome: null, ...over,
});

it('computes counts and average holding days', () => {
  const s = computeStats([
    t({}),
    t({ status: 'closed', outcome: 'success', opened_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-11T00:00:00Z' }),
    t({ status: 'closed', outcome: 'fail', opened_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-31T00:00:00Z' }),
  ]);
  expect(s.total).toBe(3);
  expect(s.active).toBe(1);
  expect(s.success).toBe(1);
  expect(s.fail).toBe(1);
  expect(s.avgHoldingDays).toBe(20); // (10+30)/2
  expect(s.failedTheses).toHaveLength(1);
});

it('handles empty list', () => {
  const s = computeStats([]);
  expect(s.total).toBe(0);
  expect(s.avgHoldingDays).toBeNull();
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```ts
// src/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Thesis } from '../types/db';

export interface Stats {
  total: number; active: number; success: number; fail: number;
  avgHoldingDays: number | null; failedTheses: Thesis[];
}

export function computeStats(theses: Thesis[]): Stats {
  const closed = theses.filter((t) => t.closed_at);
  const days = closed.map((t) => (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 86400000);
  return {
    total: theses.length,
    active: theses.filter((t) => t.status !== 'closed').length,
    success: theses.filter((t) => t.outcome === 'success').length,
    fail: theses.filter((t) => t.outcome === 'fail').length,
    avgHoldingDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    failedTheses: theses.filter((t) => t.outcome === 'fail'),
  };
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theses').select('*');
      if (error) throw error;
      return computeStats((data ?? []) as Thesis[]);
    },
  });
}
```

```ts
// src/hooks/useHoldings.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Holding } from '../types/db';

export function useHoldings() {
  return useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Holding[];
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
      if (error) throw new Error(error.message.includes('FREE_PLAN_LIMIT') ? '무료 플랜은 종목 5개까지 등록할 수 있어요.' : error.message);
      return data as Holding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  });
}
```

```ts
// src/hooks/useTheses.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Thesis } from '../types/db';

export function useTheses(holdingId?: string) {
  return useQuery({
    queryKey: ['theses', holdingId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('theses').select('*').order('opened_at', { ascending: false });
      if (holdingId) q = q.eq('holding_id', holdingId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Thesis[];
    },
  });
}

export function useThesis(id: string) {
  return useQuery({
    queryKey: ['thesis', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('theses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Thesis;
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
      return data as Thesis;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['theses'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
}
```

```ts
// src/hooks/useCheckConditions.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CheckCondition } from '../types/db';

export type CalendarItem = CheckCondition & { theses: { id: string; holdings: { ticker: string } } };

export function useCheckConditions() {
  return useQuery({
    queryKey: ['check_conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_conditions')
        .select('*, theses!inner(id, holdings!inner(ticker))')
        .eq('status', 'open')
        .not('next_check_date', 'is', null)
        .order('next_check_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarItem[];
    },
  });
}
```

```ts
// src/hooks/useCheckResults.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CheckResult } from '../types/db';

export type CheckResultItem = CheckResult & { theses: { id: string; holdings: { ticker: string; name: string } } };

export function useCheckResults(date?: string) {
  const day = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['check_results', day],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_results')
        .select('*, theses!inner(id, holdings!inner(ticker, name))')
        .eq('check_date', day)
        .order('opinion', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CheckResultItem[];
    },
  });
}
```

- [x] **Step 3: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add data hooks (holdings, theses, conditions, results, stats)"`

---

### Task 7: 탭 셸 + 내비게이션

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (교체), 템플릿 데모 파일 삭제(`app/(tabs)/explore.tsx`, 데모 컴포넌트)
- Create: `app/(tabs)/index.tsx`, `app/(tabs)/calendar.tsx`, `app/(tabs)/checks.tsx`, `app/(tabs)/history.tsx` (빈 화면 골격)
- Test: 렌더 스모크는 Task 8+에서 화면별로. 여기선 `npx tsc --noEmit`.

**Interfaces:**
- Produces: 4탭 라우트 `/(tabs)`(종목), `/calendar`(일정), `/checks`(점검), `/history`(히스토리). 다크 탭바(활성=primary, 비활성=muted).

- [x] **Step 1: 탭 레이아웃 구현**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, type } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.canvasDark }, headerTintColor: colors.onDark,
      headerShadowVisible: false,
      tabBarStyle: { backgroundColor: colors.canvasDark, borderTopColor: colors.hairlineOnDark },
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: type.navLink,
      sceneStyle: { backgroundColor: colors.canvasDark },
    }}>
      <Tabs.Screen name="index" options={{ title: '종목', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: '일정', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="checks" options={{ title: '점검', tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: '히스토리', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [x] **Step 2: 4개 화면 골격 생성** (각각 동일 패턴, title만 다름)

```tsx
// app/(tabs)/calendar.tsx  (index/checks/history 동일 골격)
import { View, Text } from 'react-native';
import { colors, type, space } from '../../src/theme';

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.bodyMd, { color: colors.muted }]}>확인 일정이 여기 표시됩니다.</Text>
    </View>
  );
}
```

- [x] **Step 3: 템플릿 데모 파일 삭제 + 타입체크**

```bash
rm -f app/(tabs)/explore.tsx
npx tsc --noEmit && npm test
```

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add 4-tab shell (holdings/calendar/checks/history)"`

---

### Task 8: 종목 화면 + TradingView 위젯 + 종목 추가

**Files:**
- Create: `src/components/TVChart.tsx`, `src/components/HoldingCard.tsx`, `app/holding/new.tsx`
- Modify: `app/(tabs)/index.tsx`
- Test: `__tests__/tvchart.test.ts` (심볼 매핑 순수함수)

**Interfaces:**
- Consumes: `useHoldings`, `useAddHolding`, `useTheses`, `Card`, `StatusBadge`, `PrimaryButton`, `TextField`
- Produces: `toTVSymbol(ticker: string, market: 'KRX'|'US'): string` (`005930`+`KRX`→`KRX:005930`, `NVDA`+`US`→`NVDA`), `TVChart({ ticker, market, height? })`, `HoldingCard({ holding, latestStatus, onPress })`

- [x] **Step 1: 설치** — `npx expo install react-native-webview`

- [x] **Step 2: 실패 테스트**

```ts
// __tests__/tvchart.test.ts
import { toTVSymbol } from '../src/components/TVChart';
it('maps KRX and US symbols', () => {
  expect(toTVSymbol('005930', 'KRX')).toBe('KRX:005930');
  expect(toTVSymbol('NVDA', 'US')).toBe('NVDA');
});
```

- [x] **Step 3: 실행 → FAIL. 구현:**

```tsx
// src/components/TVChart.tsx
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme';

export function toTVSymbol(ticker: string, market: 'KRX' | 'US'): string {
  return market === 'KRX' ? `KRX:${ticker}` : ticker;
}

export function TVChart({ ticker, market, height = 220 }: { ticker: string; market: 'KRX' | 'US'; height?: number }) {
  const symbol = toTVSymbol(ticker, market);
  const html = `<!doctype html><html><body style="margin:0;background:${colors.canvasDark}">
    <div class="tradingview-widget-container">
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" async>
      {"symbol":"${symbol}","width":"100%","height":"${height}","locale":"kr","dateRange":"3M","colorTheme":"dark","isTransparent":true,"autosize":false}
      </script>
    </div></body></html>`;
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCardDark }}>
      <WebView source={{ html }} style={{ backgroundColor: 'transparent' }} scrollEnabled={false} />
    </View>
  );
}
```

```tsx
// src/components/HoldingCard.tsx
import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { StatusBadge, Opinion } from './StatusBadge';
import { colors, type, space } from '../theme';
import type { Holding } from '../types/db';

export function HoldingCard({ holding, latestStatus, onPress }: {
  holding: Holding; latestStatus: Opinion | null; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[type.titleMd, { color: colors.onDark }]}>{holding.name}</Text>
            <Text style={[type.numberSm, { color: colors.muted, marginTop: 2 }]}>{holding.market}:{holding.ticker}</Text>
          </View>
          {latestStatus ? <StatusBadge status={latestStatus} /> :
            <Text style={[type.caption, { color: colors.muted }]}>가설 없음</Text>}
        </View>
      </Card>
    </Pressable>
  );
}
```

- [x] **Step 4: 종목 목록 화면 + 추가 화면**

```tsx
// app/(tabs)/index.tsx
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHoldings } from '../../src/hooks/useHoldings';
import { useTheses } from '../../src/hooks/useTheses';
import { HoldingCard } from '../../src/components/HoldingCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors, type, space } from '../../src/theme';
import type { Opinion } from '../../src/components/StatusBadge';

export default function HoldingsScreen() {
  const router = useRouter();
  const { data: holdings, isLoading } = useHoldings();
  const { data: theses } = useTheses();

  const latestStatus = (holdingId: string): Opinion | null => {
    const t = (theses ?? []).find((x) => x.holding_id === holdingId && x.status !== 'closed');
    if (!t) return null;
    return t.status === 'active' ? 'hold' : (t.status as Opinion) === 'watching' as never ? 'watch' : (t.status as Opinion);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <FlatList
        data={holdings ?? []}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => {
          const active = (theses ?? []).find((t) => t.holding_id === item.id && t.status !== 'closed');
          return (
            <HoldingCard holding={item} latestStatus={latestStatus(item.id)}
              onPress={() => active ? router.push(`/thesis/${active.id}`) : router.push({ pathname: '/thesis/new', params: { holdingId: item.id } })} />
          );
        }}
        ListEmptyComponent={!isLoading ? (
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            종목을 등록하고 매수 가설을 기록해 보세요.
          </Text>
        ) : null}
      />
      <PrimaryButton title="종목 추가" onPress={() => router.push('/holding/new')} />
    </View>
  );
}
```

주의: `latestStatus`의 status 매핑은 `watching → watch` 변환이 핵심. 위 삼항이 지저분하면 이렇게 정리해도 됨:

```ts
const STATUS_TO_OPINION: Record<string, Opinion> = { active: 'hold', watching: 'watch', reduce: 'reduce', exit: 'exit' };
const latestStatus = (holdingId: string): Opinion | null => {
  const t = (theses ?? []).find((x) => x.holding_id === holdingId && x.status !== 'closed');
  return t ? STATUS_TO_OPINION[t.status] ?? null : null;
};
```

```tsx
// app/holding/new.tsx  (light 거래성 화면)
import { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAddHolding } from '../../src/hooks/useHoldings';
import { TextField } from '../../src/components/TextField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors, type, space, radius } from '../../src/theme';

export default function NewHoldingScreen() {
  const router = useRouter();
  const add = useAddHolding();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [market, setMarket] = useState<'KRX' | 'US'>('US');

  const submit = () => {
    if (!name.trim() || !ticker.trim()) { Alert.alert('입력 확인', '종목명과 티커를 입력해 주세요.'); return; }
    add.mutate({ name: name.trim(), ticker: ticker.trim(), market }, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert('등록 실패', e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasLight, padding: space.md }}>
      <Stack.Screen options={{ title: '종목 추가', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink }} />
      <TextField label="종목명" value={name} onChangeText={setName} placeholder="엔비디아" />
      <TextField label="티커" value={ticker} onChangeText={setTicker} placeholder="NVDA 또는 005930" />
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>시장</Text>
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.lg }}>
        {(['US', 'KRX'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMarket(m)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
              borderColor: market === m ? colors.primary : colors.hairlineOnLight,
              backgroundColor: market === m ? colors.primary + '1F' : colors.canvasLight }}>
            <Text style={[type.titleSm, { color: market === m ? colors.ink : colors.muted }]}>{m === 'US' ? '해외(미국)' : '국내(KRX)'}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton title={add.isPending ? '등록 중…' : '등록'} onPress={submit} disabled={add.isPending} />
    </View>
  );
}
```

- [x] **Step 5: `npm test && npx tsc --noEmit` → PASS, Commit**

```bash
git add -A && git commit -m "feat: add holdings screen, TradingView widget, add-holding form"
```

---

### Task 9: 가설 등록 폼 (light)

**Files:**
- Create: `app/thesis/new.tsx`
- Test: `__tests__/thesisForm.test.tsx` (검증 로직)

**Interfaces:**
- Consumes: `useAddThesis`, `TextField`, `PrimaryButton`, `DISCLAIMER`
- Produces: `validateThesisInput(input): string | null` (에러 메시지 or null) — export해서 테스트. 제출 성공 시 `/thesis/[id]`로 replace 이동(검증은 Task 11에서 그 화면이 트리거).

- [x] **Step 1: 실패 테스트**

```tsx
// __tests__/thesisForm.test.tsx
import { validateThesisInput } from '../app/thesis/new';
it('requires buy_reason and break_conditions', () => {
  expect(validateThesisInput({ buy_reason: '', break_conditions: 'x', target_horizon: '1y' })).toContain('매수 이유');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: '', target_horizon: '1y' })).toContain('깨지는 조건');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: 'y', target_horizon: '' })).toContain('보유 기간');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: 'y', target_horizon: '1y' })).toBeNull();
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```tsx
// app/thesis/new.tsx
import { useState } from 'react';
import { ScrollView, Text, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAddThesis } from '../../src/hooks/useTheses';
import { TextField } from '../../src/components/TextField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { DISCLAIMER } from '../../src/constants/brand';
import { colors, type, space } from '../../src/theme';

export function validateThesisInput(i: { buy_reason: string; break_conditions: string; target_horizon: string }): string | null {
  if (!i.buy_reason.trim()) return '매수 이유를 입력해 주세요.';
  if (!i.break_conditions.trim()) return '가설이 깨지는 조건을 입력해 주세요.';
  if (!i.target_horizon.trim()) return '목표 보유 기간을 입력해 주세요.';
  return null;
}

export default function NewThesisScreen() {
  const router = useRouter();
  const { holdingId } = useLocalSearchParams<{ holdingId: string }>();
  const add = useAddThesis();
  const [buyReason, setBuyReason] = useState('');
  const [breakConditions, setBreakConditions] = useState('');
  const [addConditions, setAddConditions] = useState('');
  const [horizon, setHorizon] = useState('');

  const submit = () => {
    const err = validateThesisInput({ buy_reason: buyReason, break_conditions: breakConditions, target_horizon: horizon });
    if (err) { Alert.alert('입력 확인', err); return; }
    add.mutate(
      { holding_id: holdingId!, buy_reason: buyReason.trim(), break_conditions: breakConditions.trim(),
        add_conditions: addConditions.trim() || null, target_horizon: horizon.trim() },
      { onSuccess: (t) => router.replace(`/thesis/${t.id}`), onError: (e) => Alert.alert('저장 실패', e.message) },
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasLight }} contentContainerStyle={{ padding: space.md }}>
      <Stack.Screen options={{ title: '매수 가설 등록', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink }} />
      <TextField label="매수 이유 (가설)" value={buyReason} onChangeText={setBuyReason} multiline
        placeholder="예: AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유" />
      <TextField label="가설이 깨지는 조건" value={breakConditions} onChangeText={setBreakConditions} multiline
        placeholder="예: 빅테크 CAPEX 가이던스 하향, 데이터센터 성장률 둔화" />
      <TextField label="추가매수 조건 (선택)" value={addConditions} onChangeText={setAddConditions} multiline
        placeholder="예: 실적 유지 + 주가 20% 조정 시" />
      <TextField label="목표 보유 기간" value={horizon} onChangeText={setHorizon} placeholder="예: 2년" />
      <PrimaryButton title={add.isPending ? '저장 중…' : '가설 저장'} onPress={submit} disabled={add.isPending} />
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
```

- [x] **Step 3: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add thesis creation form with validation and disclaimer"`

---

### Task 10: Edge Function — OpenAI 래퍼 + gpt-verify

**Files:**
- Create: `supabase/functions/_shared/openai.ts`, `supabase/functions/gpt-verify/index.ts`, `supabase/functions/tests/openai_test.ts`, `supabase/functions/tests/verify_test.ts`, `supabase/functions/deno.json`
- Test: `deno test --allow-env supabase/functions/tests/`

**Interfaces:**
- Consumes: env `OPENAI_API_KEY`, `OPENAI_MODEL_SCAN`(기본 `gpt-5`), `OPENAI_MODEL_EVAL`(기본 `gpt-5-mini`) — 배포 시 최신 모델명 확인 후 env로 조정.
- Produces:
  - `callOpenAI(opts: { model: string; input: string; webSearch?: boolean; maxOutputTokens?: number; fetchFn?: typeof fetch }): Promise<string>` — Responses API 호출, `output_text` 반환.
  - `parseJsonBlock<T>(raw: string): T` — GPT 응답에서 JSON 추출(```json 펜스/전후 텍스트 허용), 실패 시 throw.
  - `gpt-verify` HTTP: POST `{ thesis_id }` (user JWT) → 가설 로드 → 웹검색 검증 → `theses.soundness_review` 업데이트 + `check_conditions` insert → `{ soundness, counterpoints, check_conditions }` 반환.

- [x] **Step 1: deno 확인 + 실패 테스트**

```bash
which deno || brew install deno
```

```ts
// supabase/functions/deno.json
{ "imports": { "@supabase/supabase-js": "npm:@supabase/supabase-js@2" } }
```

```ts
// supabase/functions/tests/openai_test.ts
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { callOpenAI, parseJsonBlock } from "../_shared/openai.ts";

Deno.test("callOpenAI posts to responses API and returns output_text", async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;
  const fetchFn = ((url: string, init: RequestInit) => {
    captured = { url, body: JSON.parse(init.body as string) };
    return Promise.resolve(new Response(JSON.stringify({ output_text: "hello" }), { status: 200 }));
  }) as unknown as typeof fetch;

  Deno.env.set("OPENAI_API_KEY", "test-key");
  const out = await callOpenAI({ model: "gpt-5-mini", input: "hi", webSearch: true, fetchFn });
  assertEquals(out, "hello");
  assertEquals(captured!.url, "https://api.openai.com/v1/responses");
  assertEquals(captured!.body.model, "gpt-5-mini");
  assertEquals((captured!.body.tools as Array<{ type: string }>)[0].type, "web_search");
});

Deno.test("callOpenAI throws on non-200", async () => {
  const fetchFn = (() => Promise.resolve(new Response("rate limited", { status: 429 }))) as unknown as typeof fetch;
  Deno.env.set("OPENAI_API_KEY", "test-key");
  await assertRejects(() => callOpenAI({ model: "m", input: "x", fetchFn }), Error, "OpenAI 429");
});

Deno.test("parseJsonBlock handles fenced and plain JSON", () => {
  assertEquals(parseJsonBlock<{ a: number }>('```json\n{"a":1}\n```').a, 1);
  assertEquals(parseJsonBlock<{ a: number }>('전문: {"a":2} 끝').a, 2);
});
```

- [x] **Step 2: 실행 → FAIL 확인** — `deno test --allow-env supabase/functions/tests/openai_test.ts`

- [x] **Step 3: 구현**

```ts
// supabase/functions/_shared/openai.ts
export interface CallOpts {
  model: string; input: string; webSearch?: boolean; maxOutputTokens?: number; fetchFn?: typeof fetch;
}

interface ResponsesOutput {
  output_text?: string;
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
}

export async function callOpenAI(opts: CallOpts): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const f = opts.fetchFn ?? fetch;
  const body: Record<string, unknown> = {
    model: opts.model,
    input: opts.input,
    max_output_tokens: opts.maxOutputTokens ?? 1200,
  };
  if (opts.webSearch) body.tools = [{ type: "web_search" }];
  const res = await f("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as ResponsesOutput;
  if (data.output_text) return data.output_text;
  const text = (data.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && c.text)
    .map((c) => c.text).join("");
  if (!text) throw new Error("OpenAI: empty output");
  return text;
}

export function parseJsonBlock<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as T;
}
```

```ts
// supabase/functions/gpt-verify/index.ts
import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock } from "../_shared/openai.ts";

interface VerifyResult {
  soundness: string;
  counterpoints: string[];
  check_conditions: Array<{ label: string; event_type: "earnings" | "guidance" | "metric" | "custom"; next_check_date: string | null }>;
}

export function buildVerifyPrompt(p: { name: string; ticker: string; market: string; buy_reason: string; break_conditions: string; target_horizon: string; today: string }): string {
  return `당신은 투자 가설 검증 보조 도구다. 자문·추천이 아니라 논리 점검과 일정 추출만 한다. "매수/매도하세요" 같은 표현 금지.
오늘: ${p.today}
종목: ${p.name} (${p.market}:${p.ticker})
매수 가설: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
목표 보유 기간: ${p.target_horizon}

웹검색으로 이 종목의 다가오는 이벤트(실적발표일 등)를 확인하고, 다음 JSON만 출력:
{"soundness":"가설의 논리 타당성 평가와 빠진 관점 (한국어 3-5문장)","counterpoints":["가설이 깨질 수 있는 시나리오 2-4개"],"check_conditions":[{"label":"확인 항목","event_type":"earnings|guidance|metric|custom","next_check_date":"YYYY-MM-DD 또는 null"}]}`;
}

export async function handleVerify(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  try {
    const { thesis_id } = await req.json();
    if (!thesis_id) return new Response(JSON.stringify({ error: "thesis_id required" }), { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: thesis, error } = await supabase
      .from("theses").select("*, holdings!inner(name, ticker, market)").eq("id", thesis_id).single();
    if (error || !thesis) return new Response(JSON.stringify({ error: "thesis not found" }), { status: 404 });

    const call = deps?.callFn ?? callOpenAI;
    const raw = await call({
      model: Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5",
      input: buildVerifyPrompt({
        name: thesis.holdings.name, ticker: thesis.holdings.ticker, market: thesis.holdings.market,
        buy_reason: thesis.buy_reason, break_conditions: thesis.break_conditions,
        target_horizon: thesis.target_horizon, today: new Date().toISOString().slice(0, 10),
      }),
      webSearch: true, maxOutputTokens: 1500,
    });
    const result = parseJsonBlock<VerifyResult>(raw);

    await supabase.from("theses").update({
      soundness_review: { soundness: result.soundness, counterpoints: result.counterpoints },
    }).eq("id", thesis_id);
    if (result.check_conditions.length) {
      await supabase.from("check_conditions").insert(
        result.check_conditions.map((c) => ({ thesis_id, label: c.label, event_type: c.event_type, next_check_date: c.next_check_date })),
      );
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

Deno.serve(handleVerify);
```

```ts
// supabase/functions/tests/verify_test.ts
import { assertEquals } from "jsr:@std/assert";
import { buildVerifyPrompt } from "../gpt-verify/index.ts";

Deno.test("verify prompt contains thesis fields and JSON contract, no advice tone", () => {
  const p = buildVerifyPrompt({
    name: "엔비디아", ticker: "NVDA", market: "US",
    buy_reason: "AI 인프라 증가", break_conditions: "CAPEX 하향", target_horizon: "2년", today: "2026-07-09",
  });
  for (const s of ["엔비디아", "US:NVDA", "AI 인프라 증가", "CAPEX 하향", "check_conditions", "next_check_date"]) {
    assertEquals(p.includes(s), true, `missing: ${s}`);
  }
  assertEquals(p.includes("매수/매도하세요"), true); // 금지 지시 명시 확인
});
```

주: `Deno.serve(handleVerify)`는 테스트 import 시 서버가 뜨므로, 테스트가 걸리면 `if (import.meta.main) Deno.serve(handleVerify);`로 가드한다 — Supabase 배포 환경에선 main으로 실행되므로 동작 동일.

- [x] **Step 4: 실행 → PASS 확인** — `deno test --allow-env supabase/functions/tests/`

- [x] **Step 5: Commit** — `git add -A && git commit -m "feat: add OpenAI wrapper and gpt-verify edge function with tests"`

---

### Task 11: 가설 상세 화면 + 검증 연동

**Files:**
- Create: `app/thesis/[id].tsx`, `src/hooks/useVerifyThesis.ts`
- Test: 훅 로직은 supabase invoke 래퍼라 화면 렌더는 수동 확인 항목으로. `npx tsc --noEmit` 필수.

**Interfaces:**
- Consumes: `useThesis`, `supabase.functions.invoke('gpt-verify')`, `TVChart`, `Card`, `StatusBadge`, `DISCLAIMER`
- Produces: `useVerifyThesis(): UseMutationResult` — `mutate(thesisId)` → 성공 시 `['thesis', id]`·`['check_conditions']` invalidate. 상세 화면: 가설 텍스트 + soundness_review(없으면 "AI 검증" 버튼) + TVChart.

- [x] **Step 1: 훅 구현**

```ts
// src/hooks/useVerifyThesis.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useVerifyThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (thesisId: string) => {
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
```

- [x] **Step 2: 상세 화면 구현**

```tsx
// app/thesis/[id].tsx
import { ScrollView, Text, View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useThesis } from '../../src/hooks/useTheses';
import { useHoldings } from '../../src/hooks/useHoldings';
import { useVerifyThesis } from '../../src/hooks/useVerifyThesis';
import { TVChart } from '../../src/components/TVChart';
import { Card } from '../../src/components/Card';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { DISCLAIMER } from '../../src/constants/brand';
import { colors, type, space } from '../../src/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.titleSm, { color: colors.muted, marginBottom: space.xxs }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function ThesisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: thesis, isLoading } = useThesis(id!);
  const { data: holdings } = useHoldings();
  const verify = useVerifyThesis();

  if (isLoading || !thesis) return <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />;
  const holding = (holdings ?? []).find((h) => h.id === thesis.holding_id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md }}>
      <Stack.Screen options={{ title: holding ? `${holding.name} 가설` : '가설' }} />
      {holding && <View style={{ marginBottom: space.lg }}><TVChart ticker={holding.ticker} market={holding.market} /></View>}

      <Card style={{ marginBottom: space.lg }}>
        <Section title="매수 이유">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.buy_reason}</Text>
        </Section>
        <Section title="깨지는 조건">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.break_conditions}</Text>
        </Section>
        {thesis.add_conditions ? (
          <Section title="추가매수 조건">
            <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.add_conditions}</Text>
          </Section>
        ) : null}
        <Section title="목표 보유 기간">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.target_horizon}</Text>
        </Section>
      </Card>

      {thesis.soundness_review ? (
        <Card style={{ marginBottom: space.lg }}>
          <Section title="AI 합당성 평가">
            <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.soundness_review.soundness}</Text>
          </Section>
          <Section title="반박 포인트">
            {thesis.soundness_review.counterpoints.map((c, i) => (
              <Text key={i} style={[type.bodyMd, { color: colors.tradingDown, marginBottom: space.xxs }]}>· {c}</Text>
            ))}
          </Section>
        </Card>
      ) : (
        <PrimaryButton
          title={verify.isPending ? '검증 중… (수십 초 걸릴 수 있어요)' : 'AI 가설 검증'}
          disabled={verify.isPending}
          onPress={() => verify.mutate(id!, { onError: (e) => Alert.alert('검증 실패', e.message) })}
        />
      )}
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
```

- [x] **Step 3: `npx tsc --noEmit && npm test` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add thesis detail screen with AI verification flow"`

---

### Task 12: 캘린더(확인 일정) 화면

**Files:**
- Create: `src/components/CalendarRow.tsx`
- Modify: `app/(tabs)/calendar.tsx`
- Test: `__tests__/calendar.test.ts` (월별 그룹핑 순수함수)

**Interfaces:**
- Consumes: `useCheckConditions` (`CalendarItem[]`)
- Produces: `groupByMonth(items: CalendarItem[]): Array<{ month: string; items: CalendarItem[] }>` (month = `2026-08` → 표기 `8월`), `CalendarRow({ item, onPress })` — 좌 날짜(Plex)·중 라벨·우 종목칩, earnings는 `★` gold.

- [x] **Step 1: 실패 테스트**

```ts
// __tests__/calendar.test.ts
import { groupByMonth, formatMonth } from '../src/components/CalendarRow';

const item = (date: string, label: string) => ({
  id: label, thesis_id: 't', label, event_type: 'metric' as const,
  next_check_date: date, status: 'open' as const,
  theses: { id: 't', holdings: { ticker: 'NVDA' } },
});

it('groups sorted items by month', () => {
  const g = groupByMonth([item('2026-07-15', 'a'), item('2026-07-28', 'b'), item('2026-08-05', 'c')]);
  expect(g).toHaveLength(2);
  expect(g[0].month).toBe('2026-07');
  expect(g[0].items.map((i) => i.label)).toEqual(['a', 'b']);
  expect(formatMonth('2026-08')).toBe('8월');
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```tsx
// src/components/CalendarRow.tsx
import { Pressable, Text, View } from 'react-native';
import { colors, type, space } from '../theme';
import type { CalendarItem } from '../hooks/useCheckConditions';

export function groupByMonth(items: CalendarItem[]): Array<{ month: string; items: CalendarItem[] }> {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    if (!it.next_check_date) continue;
    const m = it.next_check_date.slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(it);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, its]) => ({ month, items: its }));
}

export function formatMonth(m: string): string {
  return `${parseInt(m.slice(5), 10)}월`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarRow({ item, onPress }: { item: CalendarItem; onPress: () => void }) {
  const d = new Date(item.next_check_date! + 'T00:00:00');
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
      <Text style={[type.numberSm, { color: colors.mutedStrong, width: 64 }]}>
        {String(d.getDate()).padStart(2, '0')} ({DOW[d.getDay()]})
      </Text>
      <Text style={[type.titleSm, { color: colors.onDark, flex: 1 }]} numberOfLines={1}>{item.label}</Text>
      <Text style={[type.caption, { color: colors.muted, marginRight: space.xs }]}>{item.theses.holdings.ticker}</Text>
      {item.event_type === 'earnings' ? <Text style={{ color: colors.primary }}>★</Text> : null}
    </Pressable>
  );
}
```

```tsx
// app/(tabs)/calendar.tsx
import { SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckConditions } from '../../src/hooks/useCheckConditions';
import { CalendarRow, groupByMonth, formatMonth } from '../../src/components/CalendarRow';
import { colors, type, space } from '../../src/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const { data, isLoading } = useCheckConditions();
  const sections = groupByMonth(data ?? []).map((g) => ({ title: formatMonth(g.month), data: g.items }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, paddingHorizontal: space.md }}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        renderSectionHeader={({ section }) => (
          <Text style={[type.displaySm, { color: colors.onDark, marginTop: space.lg, marginBottom: space.xs }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => <CalendarRow item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            가설을 등록하고 AI 검증을 실행하면 확인 일정이 자동으로 추가됩니다.
          </Text>
        ) : null}
      />
    </View>
  );
}
```

- [x] **Step 3: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add check-schedule calendar screen grouped by month"`

---

### Task 13: Edge Function — daily-batch (Stage1+Stage2)

**Files:**
- Create: `supabase/functions/daily-batch/index.ts`, `supabase/functions/tests/batch_test.ts`
- Test: `deno test --allow-env supabase/functions/tests/batch_test.ts`

**Interfaces:**
- Consumes: `callOpenAI`, `parseJsonBlock`, env `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_MODEL_SCAN`/`OPENAI_MODEL_EVAL`/`DAILY_WEBSEARCH_CAP`(기본 200)
- Produces: HTTP POST `{ market: 'KRX' | 'US' }` (cron 전용, `x-batch-secret` 헤더 = env `BATCH_SECRET` 검증) → `{ scanned, evaluated, skipped, notified }`.
- 순수 로직 export (테스트 대상): `shouldRunToday(date: Date): boolean` (주말 스킵), `buildScanPrompt`, `buildEvalPrompt`, `decideEval(scan: { change_level: string }): 'skip' | 'eval'`.

- [x] **Step 1: 실패 테스트**

```ts
// supabase/functions/tests/batch_test.ts
import { assertEquals } from "jsr:@std/assert";
import { shouldRunToday, decideEval, buildScanPrompt, buildEvalPrompt } from "../daily-batch/index.ts";

Deno.test("skips weekends", () => {
  assertEquals(shouldRunToday(new Date("2026-07-11T00:00:00Z")), false); // Sat
  assertEquals(shouldRunToday(new Date("2026-07-12T00:00:00Z")), false); // Sun
  assertEquals(shouldRunToday(new Date("2026-07-09T00:00:00Z")), true);  // Thu
});

Deno.test("stage2 skipped when no change", () => {
  assertEquals(decideEval({ change_level: "none" }), "skip");
  assertEquals(decideEval({ change_level: "minor" }), "eval");
  assertEquals(decideEval({ change_level: "major" }), "eval");
});

Deno.test("prompts carry contract", () => {
  const scan = buildScanPrompt({ ticker: "NVDA", market: "US", name: "엔비디아", today: "2026-07-09" });
  assertEquals(scan.includes("change_level"), true);
  assertEquals(scan.includes("NVDA"), true);
  const ev = buildEvalPrompt({
    buy_reason: "AI 인프라", break_conditions: "CAPEX 하향", summary: "가이던스 하향 발표", today: "2026-07-09",
  });
  assertEquals(ev.includes("hold|watch|reduce|exit"), true);
  assertEquals(ev.includes("가이던스 하향 발표"), true);
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```ts
// supabase/functions/daily-batch/index.ts
import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock } from "../_shared/openai.ts";

export function shouldRunToday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6; // MVP: 주말 스킵. 공휴일 캘린더는 Phase 2.
}

export function decideEval(scan: { change_level: string }): "skip" | "eval" {
  return scan.change_level === "none" ? "skip" : "eval";
}

export function buildScanPrompt(p: { ticker: string; market: string; name: string; today: string }): string {
  return `당신은 종목 데일리 스캐너다. 오늘(${p.today}) 기준 ${p.name}(${p.market}:${p.ticker})에 대해 웹검색으로 최근 24-48시간 내 투자 판단에 영향을 줄 뉴스·공시·실적·가이던스 변화만 확인하라. 루머·주가등락 자체는 제외. 다음 JSON만 출력:
{"summary":"핵심 변화 요약 (한국어 2-4문장, 변화 없으면 '특이사항 없음')","change_level":"none|minor|major","sources":["url1","url2"]}`;
}

export function buildEvalPrompt(p: { buy_reason: string; break_conditions: string; summary: string; today: string }): string {
  return `당신은 투자 가설 점검 보조 도구다. 자문·추천 금지. "매수/매도하세요" 표현 금지. 가설 대비 변화만 서술.
오늘: ${p.today}
사용자 가설: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
오늘 스캔 요약: ${p.summary}

스캔 내용이 가설/깨지는 조건에 미치는 영향을 판단해 다음 JSON만 출력:
{"opinion":"hold|watch|reduce|exit","rationale":"판단 근거 (한국어 2-4문장)"}`;
}

interface ScanJson { summary: string; change_level: "none" | "minor" | "major"; sources: string[] }
interface EvalJson { opinion: "hold" | "watch" | "reduce" | "exit"; rationale: string }

export async function handleBatch(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.headers.get("x-batch-secret") !== Deno.env.get("BATCH_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const { market } = await req.json() as { market: "KRX" | "US" };
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (!shouldRunToday(today)) {
    return new Response(JSON.stringify({ scanned: 0, evaluated: 0, skipped: 0, notified: 0, reason: "weekend" }), { status: 200 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const call = deps?.callFn ?? callOpenAI;
  const cap = parseInt(Deno.env.get("DAILY_WEBSEARCH_CAP") ?? "200", 10);
  const scanModel = Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5";
  const evalModel = Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini";

  // 활성 가설 + 종목 로드
  const { data: theses, error } = await db
    .from("theses")
    .select("id, user_id, buy_reason, break_conditions, holdings!inner(id, ticker, market, name)")
    .neq("status", "closed")
    .eq("holdings.market", market);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Stage 1: distinct 종목 스캔 (디둡)
  type ThesisRow = NonNullable<typeof theses>[number];
  const byTicker = new Map<string, { ticker: string; name: string; theses: ThesisRow[] }>();
  for (const t of theses ?? []) {
    const h = t.holdings as unknown as { ticker: string; name: string };
    if (!byTicker.has(h.ticker)) byTicker.set(h.ticker, { ticker: h.ticker, name: h.name, theses: [] });
    byTicker.get(h.ticker)!.theses.push(t);
  }

  let scanned = 0, evaluated = 0, skipped = 0, notified = 0;
  const { data: usage } = await db.from("usage_daily").upsert({ usage_date: todayStr }, { onConflict: "usage_date" }).select().single();
  let webCalls = usage?.web_search_calls ?? 0;

  for (const [ticker, group] of byTicker) {
    try {
      // 이미 오늘 스캔 있으면 재사용 (디둡 + 재실행 안전)
      let { data: scan } = await db.from("daily_scans").select("*")
        .eq("ticker", ticker).eq("market", market).eq("scan_date", todayStr).maybeSingle();

      if (!scan) {
        if (webCalls >= cap) { console.error(`cap reached (${cap}), stopping scans`); break; }
        const raw = await call({ model: scanModel, input: buildScanPrompt({ ticker, market, name: group.name, today: todayStr }), webSearch: true, maxOutputTokens: 800 });
        const parsed = parseJsonBlock<ScanJson>(raw);
        const { data: inserted } = await db.from("daily_scans")
          .insert({ ticker, market, scan_date: todayStr, summary: parsed.summary, change_level: parsed.change_level, sources: parsed.sources })
          .select().single();
        scan = inserted; scanned++; webCalls++;
        await db.from("usage_daily").update({ web_search_calls: webCalls }).eq("usage_date", todayStr);
      }
      if (!scan) continue;

      // Stage 2: 가설별 평가
      for (const t of group.theses) {
        const { data: exists } = await db.from("check_results").select("id").eq("thesis_id", t.id).eq("check_date", todayStr).maybeSingle();
        if (exists) continue;

        let opinion: EvalJson["opinion"] = "hold";
        let rationale = "오늘은 가설을 변경할 만한 새로운 정보가 없습니다.";
        if (decideEval(scan) === "eval") {
          const raw = await call({ model: evalModel, input: buildEvalPrompt({ buy_reason: t.buy_reason, break_conditions: t.break_conditions, summary: scan.summary, today: todayStr }), maxOutputTokens: 400 });
          const ev = parseJsonBlock<EvalJson>(raw);
          opinion = ev.opinion; rationale = ev.rationale; evaluated++;
          await db.from("usage_daily").update({ eval_calls: (usage?.eval_calls ?? 0) + evaluated }).eq("usage_date", todayStr);
        } else { skipped++; }

        await db.from("check_results").insert({ thesis_id: t.id, check_date: todayStr, opinion, rationale, scan_ref: scan.id });
        if (opinion !== "hold") {
          const { data: prof } = await db.from("profiles").select("expo_push_token").eq("id", t.user_id).single();
          if (prof?.expo_push_token) {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: prof.expo_push_token, title: `${group.name} 가설 점검`, body: rationale.slice(0, 120) }),
            });
            notified++;
          }
        }
      }
    } catch (e) {
      console.error(`ticker ${ticker} failed: ${e}`); // 종목별 독립 — 전체 배치 중단 금지
    }
  }

  return new Response(JSON.stringify({ scanned, evaluated, skipped, notified }), { status: 200, headers: { "Content-Type": "application/json" } });
}

if (import.meta.main) Deno.serve(handleBatch);
```

- [x] **Step 3: 실행 → PASS** — `deno test --allow-env supabase/functions/tests/`

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add daily-batch edge function (2-stage scan/eval, dedup, cost cap)"`

---

### Task 14: pg_cron 마이그레이션 + 푸시 토큰 등록

**Files:**
- Create: `supabase/migrations/0002_cron.sql`, `src/lib/push.ts`
- Modify: `app/_layout.tsx` (토큰 등록 호출)
- Test: `__tests__/push.test.ts`

**Interfaces:**
- Produces: cron 2개(KRX 08:00 UTC = 17:00 KST, US 22:00 UTC ≈ 17~18:00 ET / 평일). `registerPushToken(): Promise<void>` — 권한 요청 → expo push token → `profiles.expo_push_token` 업데이트. 실패해도 throw 안 함(푸시는 선택 기능).

- [x] **Step 1: cron SQL**

```sql
-- supabase/migrations/0002_cron.sql
-- 배포 시: {{PROJECT_REF}} 와 {{BATCH_SECRET}} 치환 필요 (README 참고)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('whybuy-daily-krx', '0 8 * * 1-5', $$
  select net.http_post(
    url := 'https://{{PROJECT_REF}}.supabase.co/functions/v1/daily-batch',
    headers := '{"Content-Type":"application/json","x-batch-secret":"{{BATCH_SECRET}}"}'::jsonb,
    body := '{"market":"KRX"}'::jsonb
  );
$$);

select cron.schedule('whybuy-daily-us', '0 22 * * 1-5', $$
  select net.http_post(
    url := 'https://{{PROJECT_REF}}.supabase.co/functions/v1/daily-batch',
    headers := '{"Content-Type":"application/json","x-batch-secret":"{{BATCH_SECRET}}"}'::jsonb,
    body := '{"market":"US"}'::jsonb
  );
$$);
```

- [x] **Step 2: 설치 + 실패 테스트**

```bash
npx expo install expo-notifications expo-device expo-constants
```

```ts
// __tests__/push.test.ts
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('../src/lib/supabase', () => ({ supabase: null }));
import { registerPushToken } from '../src/lib/push';

it('resolves without throwing on simulator/denied permission', async () => {
  await expect(registerPushToken()).resolves.toBeUndefined();
});
```

- [x] **Step 3: 실행 → FAIL. 구현:**

```ts
// src/lib/push.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice || !supabase) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userData.user.id);
  } catch {
    // 푸시는 선택 기능 — 실패해도 앱 동작에 영향 없음
  }
}
```

`app/_layout.tsx`의 `RootLayout`에 추가 (폰트 로드 useEffect 아래):

```tsx
import { registerPushToken } from '../src/lib/push';
// ...
useEffect(() => { registerPushToken(); }, []);
```

- [x] **Step 4: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 5: Commit** — `git add -A && git commit -m "feat: add pg_cron schedules and push token registration"`

---

### Task 15: 데일리 점검 화면

**Files:**
- Create: `src/components/CheckResultCard.tsx`
- Modify: `app/(tabs)/checks.tsx`
- Test: `__tests__/checkresult.test.tsx` (카드 렌더)

**Interfaces:**
- Consumes: `useCheckResults`, `StatusBadge`, `Card`
- Produces: `CheckResultCard({ item, onPress })` — 상단 종목명+StatusBadge, 본문 rationale.

- [x] **Step 1: 실패 테스트**

```tsx
// __tests__/checkresult.test.tsx
import { render } from '@testing-library/react-native';
import { CheckResultCard } from '../src/components/CheckResultCard';

const item = {
  id: 'r1', thesis_id: 't1', check_date: '2026-07-09', opinion: 'watch' as const,
  rationale: '핵심 고객 CAPEX 가이던스 하향 발표. 가설 약화 신호.', scan_ref: null,
  theses: { id: 't1', holdings: { ticker: 'NVDA', name: '엔비디아' } },
};

it('renders name, badge, rationale', () => {
  const { getByText } = render(<CheckResultCard item={item} onPress={() => {}} />);
  expect(getByText('엔비디아')).toBeTruthy();
  expect(getByText('관찰')).toBeTruthy();
  expect(getByText(/CAPEX 가이던스 하향/)).toBeTruthy();
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```tsx
// src/components/CheckResultCard.tsx
import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { colors, type, space } from '../theme';
import type { CheckResultItem } from '../hooks/useCheckResults';

export function CheckResultCard({ item, onPress }: { item: CheckResultItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs }}>
          <Text style={[type.titleMd, { color: colors.onDark }]}>{item.theses.holdings.name}</Text>
          <StatusBadge status={item.opinion} />
        </View>
        <Text style={[type.bodyMd, { color: colors.body }]}>{item.rationale}</Text>
      </Card>
    </Pressable>
  );
}
```

```tsx
// app/(tabs)/checks.tsx
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckResults } from '../../src/hooks/useCheckResults';
import { CheckResultCard } from '../../src/components/CheckResultCard';
import { DISCLAIMER } from '../../src/constants/brand';
import { colors, type, space } from '../../src/theme';

export default function ChecksScreen() {
  const router = useRouter();
  const { data, isLoading } = useCheckResults();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <CheckResultCard item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            오늘 점검 결과가 아직 없습니다. 점검은 장 마감 후 하루 1회 자동 실행됩니다.
          </Text>
        ) : null}
        ListFooterComponent={<Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>}
      />
    </View>
  );
}
```

- [x] **Step 3: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add daily check results screen"`

---

### Task 16: 히스토리·통계 화면

**Files:**
- Create: `src/components/StatCallout.tsx`
- Modify: `app/(tabs)/history.tsx`
- Test: `__tests__/statcallout.test.tsx`

**Interfaces:**
- Consumes: `useStats` (`Stats`), `useTheses`, `Card`
- Produces: `StatCallout({ label, value })` — gold `number-display`(Plex). 화면: 상단 콜아웃 그리드(전체/유효/성공/실패/평균 유지일) + 실패 가설 리스트(깨진 조건 = 반복 패턴 기초 데이터).

- [x] **Step 1: 실패 테스트**

```tsx
// __tests__/statcallout.test.tsx
import { render } from '@testing-library/react-native';
import { StatCallout } from '../src/components/StatCallout';

it('renders label and value', () => {
  const { getByText } = render(<StatCallout label="전체 가설" value="24" />);
  expect(getByText('전체 가설')).toBeTruthy();
  expect(getByText('24')).toBeTruthy();
});
```

- [x] **Step 2: 실행 → FAIL. 구현:**

```tsx
// src/components/StatCallout.tsx
import { Text, View } from 'react-native';
import { colors, type, space } from '../theme';

export function StatCallout({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', marginBottom: space.md }}>
      <Text style={[type.numberDisplay, { color: colors.primary }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}
```

```tsx
// app/(tabs)/history.tsx
import { ScrollView, Text, View } from 'react-native';
import { useStats } from '../../src/hooks/useStats';
import { StatCallout } from '../../src/components/StatCallout';
import { Card } from '../../src/components/Card';
import { colors, type, space } from '../../src/theme';

export default function HistoryScreen() {
  const { data: stats } = useStats();
  if (!stats) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md }}>
      <Text style={[type.displaySm, { color: colors.onDark, marginBottom: space.lg }]}>내 투자 가설 통계</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <StatCallout label="전체 가설" value={String(stats.total)} />
        <StatCallout label="유효(진행중)" value={String(stats.active)} />
        <StatCallout label="성공" value={String(stats.success)} />
        <StatCallout label="실패" value={String(stats.fail)} />
        <StatCallout label="평균 유지 기간" value={stats.avgHoldingDays !== null ? `${stats.avgHoldingDays}일` : '—'} />
      </View>
      {stats.failedTheses.length > 0 && (
        <>
          <Text style={[type.titleLg, { color: colors.onDark, marginTop: space.lg, marginBottom: space.sm }]}>실패 가설 복기</Text>
          {stats.failedTheses.map((t) => (
            <Card key={t.id} style={{ marginBottom: space.sm }}>
              <Text style={[type.bodyMd, { color: colors.body }]} numberOfLines={2}>{t.buy_reason}</Text>
              <Text style={[type.bodySm, { color: colors.tradingDown, marginTop: space.xxs }]}>깨진 조건: {t.break_conditions}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
```

- [x] **Step 3: `npm test && npx tsc --noEmit` → PASS**

- [x] **Step 4: Commit** — `git add -A && git commit -m "feat: add history/stats screen with failed-thesis review"`

---

### Task 17: README + 배포 체크리스트 + 최종 검증

**Files:**
- Create: `README.md`
- Test: 전체 스위트

**Interfaces:**
- Produces: 로컬 실행·Supabase 프로젝트 셋업·Edge Function 배포·cron 치환 절차 문서.

- [x] **Step 1: README 작성**

````markdown
# WhyBuy (왜샀나)

투자 가설을 기록하면 AI가 합당성을 검증하고, 확인 일정을 캘린더로 보여주고, 하루 1회 유지/관찰/축소/청산 관점으로 점검해주는 앱.
투자 자문이 아닌 판단 기록·보조 도구입니다.

## 로컬 실행
1. `npm install`
2. `.env.example` → `.env` 복사, Supabase URL/anon key 입력
3. `npx expo start`

## Supabase 셋업
1. supabase.com 프로젝트 생성 → Settings에서 URL/anon key 복사
2. Authentication → Providers → **Anonymous** 활성화
3. `supabase link --project-ref <ref>` 후 `supabase db push` (migrations 적용)
4. Edge Functions 배포: `supabase functions deploy gpt-verify daily-batch`
5. 시크릿: `supabase secrets set OPENAI_API_KEY=... BATCH_SECRET=$(openssl rand -hex 16)`
   - 모델 조정: `OPENAI_MODEL_SCAN`(기본 gpt-5), `OPENAI_MODEL_EVAL`(기본 gpt-5-mini) — **배포 전 최신 모델명/단가 확인**
6. `supabase/migrations/0002_cron.sql`의 `{{PROJECT_REF}}`/`{{BATCH_SECRET}}` 치환 후 SQL Editor에서 실행

## 테스트
- 앱: `npm test`, 타입: `npx tsc --noEmit`
- Edge Functions: `deno test --allow-env supabase/functions/tests/`

## 배포 전 체크리스트
- [x] OpenAI web_search 현재 단가 확인 → `DAILY_WEBSEARCH_CAP` 조정
- [x] KRX 종목 한국어 웹검색 품질 실측
- [x] WhyBuy/왜샀나 상표 검색 (KIPRIS, 앱스토어)
- [x] 면책 문구 온보딩 노출 확인
````

- [x] **Step 2: 전체 검증**

```bash
npm test && npx tsc --noEmit && deno test --allow-env supabase/functions/tests/
```

Expected: 전부 PASS.

- [x] **Step 3: 금지 문자열 스캔 (Global Constraints 검증)**

```bash
grep -ri --include='*.ts' --include='*.tsx' -l -e 'FCD535' -e 'BinanceNova' -e 'BinancePlex' -e 'SAFU' app/ src/ supabase/ ; echo "exit=$? (1 = clean)"
```

Expected: 매치 0건 (exit=1).

- [x] **Step 4: Commit** — `git add -A && git commit -m "docs: add README with setup, deploy, and pre-launch checklist"`

---

### Task 18: Mock 데이터 모드 (프론트 확인용)

**Files:**
- Create: `src/lib/mock.ts` (mock 데이터셋 + 활성 판단)
- Modify: `src/hooks/*.ts` (mock 모드 분기), `.env.example` (`EXPO_PUBLIC_USE_MOCK`)
- Test: `__tests__/mock.test.ts`

**Interfaces:**
- Produces: `isMockMode(): boolean` — `EXPO_PUBLIC_USE_MOCK=1` 또는 Supabase env 미설정 시 true. `MOCK: { holdings, theses, checkConditions, checkResults }` — 종목 3개(NVDA·005930 삼성전자·TSLA), 가설 3개(soundness_review 포함), 확인일정 6개, 오늘 점검결과 3개(hold/watch/reduce 각 1). 각 훅 queryFn 첫 줄에서 mock 분기 → 실 Supabase 없이 전 화면 렌더 확인 가능.

- [ ] **Step 1: 실패 테스트** — `isMockMode` env 판정 + MOCK 데이터 shape 검증 (theses[].soundness_review 존재, checkResults 3종 opinion)
- [ ] **Step 2: 구현** — mock.ts + 훅 분기 (mutation은 mock 모드에서 in-memory push + invalidate)
- [ ] **Step 3: `npm test && npx tsc --noEmit` PASS**
- [ ] **Step 4: Commit** — `feat: add mock data mode for frontend preview`

---

## Self-Review 기록

- **스펙 커버리지**: 종목등록(T8), 가설등록+검증(T9-11), 캘린더(T12), 2단계 데일리 점검+비용레버 6개(T13: 디둡·스킵·티어링·주말스킵·출력캡·cap / 5종목 상한 T4), 히스토리·통계(T16), 푸시(T13-14), 면책 톤(T2·T9·T13·T15), TradingView 위젯(T8). 커버 완료.
- **미커버(의도적 Phase 2)**: 공휴일 캘린더(주말만 스킵), 이메일 계정 연동(익명), 결제, 캘린더 롤오버 자동화, 반복 실패 패턴 GPT 분석(실패 리스트로 기초 대체).
- **타입 일관성**: `Opinion`·`ChangeLevel`은 `src/types/db.ts` 단일 정의, StatusBadge가 re-export. Edge Function은 Deno라 앱 타입 미공유(문자열 계약 동일: hold/watch/reduce/exit, none/minor/major).
- **플레이스홀더**: cron SQL의 `{{PROJECT_REF}}`/`{{BATCH_SECRET}}`는 배포 시 치환 값(README 문서화) — 플랜 공백 아님.
````
