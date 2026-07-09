# 투자 가설 점검 앱 — 설계 문서 (WhyBuy · 왜샀나)

- **작성일**: 2026-07-09
- **상태**: 승인됨 (2026-07-09 사용자 승인)
- **앱 이름**: **WhyBuy** (한국어: **왜샀나**) — 실런칭 전 상표 검색(KIPRIS/앱스토어) 필요. 코드에선 이름을 상수 한 곳(`constants/brand.ts`)에 두어 교체 쉽게.

---

## 1. 한 줄 정의

내가 세운 투자 가설이 **아직 유효한지 하루 1번 점검**해주고, 근거를 **언제 확인해야 하는지 일정으로 보여주는** 앱.

매매 도구가 아니다. **투자 판단을 기록하고 보조하는 도구**다.

---

## 2. 목표 & 비목표

### 목표 (MVP)
1. 종목 등록
2. 매수 가설 등록 → GPT가 **합당성 검증** + 반박 포인트 제시 + **확인 일정 자동 추출**
3. 확인해야 할 일정을 **캘린더(스케줄러)** 로 모아보기
4. **하루 1회 자동 점검** → 유지 / 관찰 / 축소 / 청산 의견 + 근거
5. 가설 **히스토리·통계** (적중률, 평균 유지기간, 반복 실패 패턴)

### 비목표 (초기 버전에서 뺀다 — YAGNI)
- 커뮤니티
- 자동매매 / 주문
- 증권사 계좌 연동
- 실시간 시세 (스트리밍)
- 복잡한 차트 (지표 오버레이 등) — **단순 표시용 차트만** TradingView 위젯으로
- 백테스트
- 포트폴리오 최적화
- 뉴스 피드

---

## 3. 핵심 사용자 흐름

```
종목 등록
  ↓
매수 가설 작성  → [GPT 합당성 검증 + 반박 + 확인일정 추출]
  ↓
확인 조건 / 일정 설정
  ↓
(스케줄러 화면에서 확인 일정 관리)
  ↓
하루 1회 자동 점검
  ↓
유지 / 관찰 / 축소 / 청산 의견
  ↓
가설 히스토리·적중률 누적
```

### 예시 (엔비디아)
등록 가설:
> AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유.

확인 조건:
- 데이터센터 성장률
- 주요 빅테크 CAPEX
- 마진 변화
- 경쟁사 점유율 변화

데일리 점검 출력 (변화 없음):
> 오늘은 가설을 변경할 만한 새로운 정보가 없습니다.
> 현재 전략: 보유 유지 · 다음 주요 확인일: 8월 실적 발표 · 중요도 높은 변화: 없음

데일리 점검 출력 (약화 신호):
> 가설 약화 신호가 발생했습니다.
> 핵심 고객의 CAPEX 가이던스 하향 → 신규 매수 중단, 다음 실적까지 기존 보유 관찰.

---

## 4. 화면 구성

| # | 화면 | 설명 |
|---|------|------|
| 1 | 종목 목록 | 등록 종목 + 각 가설 상태(유지/관찰/축소/청산) 요약. 단순 표시용 미니 차트(TradingView 위젯) |
| 2 | 가설 등록/상세 | 매수이유·깨지는조건·추가매수조건·목표기간 입력 → GPT 합당성 검증 결과·반박·추출된 일정 표시 |
| 3 | 확인 일정 캘린더 (스케줄러) | 전 종목 확인 일정을 날짜순으로. 탭 → 해당 근거/가설 이동 |
| 4 | 데일리 점검 결과 | 오늘 점검 결과(의견 + 근거). 종목별 카드 |
| 5 | 히스토리·통계 | 전체/유효/성공/실패 가설 수, 평균 유지기간, 반복 실패 패턴 |

### 차트 (화면 1·2 보조)
- **TradingView 위젯을 WebView로 임베드**. 국내(`KRX:005930`) + 해외(`NASDAQ:NVDA`) 심볼 지원. 무료.
- 차트는 **표시 전용**. 앱은 TradingView에서 데이터를 빼오지 않는다 (ToS·기술 양쪽으로 불가).

---

## 5. 아키텍처

```
┌─────────────────────────┐
│  React Native (Expo)     │
│  - 화면 5개              │
│  - TradingView WebView   │
│  - expo-notifications    │
└───────────┬─────────────┘
            │ HTTPS (Supabase client SDK)
┌───────────▼─────────────┐
│  Supabase               │
│  - Auth (계정)          │
│  - Postgres (데이터)    │
│  - Edge Functions       │
│      · gpt-verify (등록 검증)  │
│      · gpt-daily-check (점검)  │
│  - pg_cron (매일 배치)  │
└───────────┬─────────────┘
            │ HTTPS (키는 Edge Function 환경변수)
┌───────────▼─────────────┐
│  OpenAI Responses API    │
│  - web_search 도구       │
└─────────────────────────┘
```

### 선택 이유
- **Expo**: 푸시·빌드·스토어 배포 빠름. MVP 커버 충분.
- **Supabase**: Auth + Postgres + Edge Functions + pg_cron + 푸시 트리거를 한 곳에서. 별도 서버 운영 최소.
- **GPT 키는 Edge Function 환경변수에만** 존재. 클라이언트에 절대 노출 안 함.

---

## 6. 데이터 모델 (Postgres)

```
user            (Supabase Auth 기본 + profile)
  id, email, plan (free|paid), created_at

holding         종목 (유저별)
  id, user_id, ticker, market (KRX|US|...), name, created_at

thesis          가설
  id, holding_id, user_id,
  buy_reason,          -- 매수 이유
  break_conditions,    -- 가설이 깨지는 조건
  add_conditions,      -- 추가매수 조건
  target_horizon,      -- 목표 보유 기간
  soundness_review,    -- GPT 합당성 평가 (JSON: 평가/반박포인트)
  status,              -- active|watching|reduce|exit|closed
  opened_at, closed_at, outcome (success|fail|null)

check_condition 확인 조건 (가설별 N개) — 캘린더 소스
  id, thesis_id,
  label,               -- "데이터센터 성장률"
  event_type,          -- earnings|guidance|metric|custom
  next_check_date,     -- 다음 확인일
  status

daily_scan      종목 일일 스캔 (Stage1 공유 캐시)
  id, ticker, scan_date,
  summary,             -- 오늘 이 종목 핵심 변화 요약
  change_level,        -- none|minor|major
  sources,             -- 참조 링크
  UNIQUE(ticker, scan_date)

check_result    데일리 점검 로그 (Stage2, 가설별)
  id, thesis_id, check_date,
  opinion,             -- hold|watch|reduce|exit
  rationale,           -- 근거 텍스트
  scan_ref,            -- 참조한 daily_scan
  UNIQUE(thesis_id, check_date)
```

**통계 화면**은 `thesis` + `check_result` 집계로 계산 (별도 테이블 불필요).

---

## 7. GPT 파이프라인

### 7-a. 등록 검증 (`gpt-verify`) — 가설·종목당 1회성
입력: 매수이유·깨지는조건·추가매수조건·목표기간
처리: web_search로 종목 기본 정보·다가오는 이벤트 확인
출력 (구조화 JSON):
- `soundness`: 합당성 평가 (논리 타당성, 빠진 관점)
- `counterpoints`: 반박 시나리오
- `check_conditions[]`: {label, event_type, next_check_date} — 캘린더에 자동 등록

### 7-b. 데일리 점검 — 2단계 (비용 핵심)

```
Stage 1 — gpt-daily-scan  (비쌈, distinct 종목당 1회/일, 공유)
  cron이 오늘 점검 대상의 distinct ticker 목록 수집
  각 ticker → web_search → "오늘 핵심 변화" 요약
  → daily_scan(ticker, today) 저장
  → change_level = none|minor|major
  → 유저 100명이 같은 종목이어도 웹검색 1콜

Stage 2 — gpt-thesis-eval  (쌈, 가설당 1회/일)
  각 활성 thesis:
    if 관련 daily_scan.change_level == none:
        → GPT 호출 없이 "유지" 고정 응답
    else:
        → (daily_scan.summary + thesis) 로 싼 모델 추론
        → opinion + rationale
  → check_result 저장. 의견이 hold 아니면 push 알림
```

핵심: **웹검색(비싼 콜)은 종목 수에 비례, 유저 수엔 거의 무관.**

---

## 8. 비용 전략

일일 비용 모델:
```
일비용 ≈ (distinct 종목 수 × Stage1 웹검색비)
        + (변화있는 가설 수 × Stage2 싼추론비)
```

레버:
1. **디둡**: 같은 종목 여러 유저 → 웹검색 1회 공유 (daily_scan)
2. **변화없음 스킵**: change_level=none → Stage2 GPT 미호출, "유지" 고정
3. **모델 티어링**: Stage2는 저가 모델, Stage1 웹검색만 상위 모델
4. **휴장 스킵**: 장 안 여는 날 cron 스킵 (KRX/US 캘린더 별도)
5. **출력 캡**: 결과는 짧은 구조화 JSON, max_tokens 짧게
6. **종목수 상한 = 과금 지점**: free 5종목, paid 구독 시 확장

> ⚠️ OpenAI web_search 단가는 배포 전 현재 pricing 재확인 필요. 위 구조는 단가와 무관하게 비용을 종목 수에 묶어 최소화한다.

---

## 9. 스케줄러 (pg_cron)

- **일일 배치**: 각 시장 장 마감 후 1회 (KRX·US 시간대 분리 실행).
- 순서: 휴장 체크 → distinct 종목 수집 → Stage1 스캔 → Stage2 평가 → 변화 있는 가설 push.
- **확인 일정 캘린더**는 `check_condition.next_check_date` 를 날짜순 조회. cron이 지난 일정 롤오버(다음 예정일 재추정).

---

## 10. 알림 (Push)

- **expo-notifications** + Supabase가 트리거.
- 조건: 데일리 점검 의견이 `hold`가 아닐 때 (관찰/축소/청산) 또는 오늘이 주요 확인일일 때.
- 하루 1회 요약 푸시 (스팸 방지).

---

## 11. 법적 / 면책 (필수)

- 포지셔닝: **"투자 판단 기록·보조 도구"**. 자문·추천 아님.
- 출력 톤: "매수/매도하세요" 금지 → "가설 대비 변화 있음/없음" 서술.
- 온보딩·결과 화면에 **면책 문구** 상시 노출: 투자 결정과 책임은 사용자 본인.
- 앱스토어 심사·투자자문업 규제 회피 위해 이 톤 일관 유지.

---

## 12. 에러 처리

- **GPT 실패/타임아웃**: 해당 가설 점검 스킵, "점검 실패 — 내일 재시도" 표기. 앱 크래시 금지.
- **web_search 결과 빈약/저품질**: change_level=none 취급, 로그에 저품질 플래그.
- **국내 종목 검색 품질**: 초기 검증 항목. 부실하면 Phase 2에서 한국어 소스/Finnhub 보강.
- **cron 부분 실패**: 종목별 독립 처리, 한 종목 실패가 전체 배치 중단 안 함.
- **비용 상한 초과**: 일일 콜 상한 도달 시 배치 중단 + 관리자 알림.

---

## 13. 테스트 전략

- **단위**: Stage2 "변화없음 스킵" 로직, 통계 집계, 캘린더 롤오버.
- **Edge Function**: GPT 응답 모킹 → 구조화 JSON 파싱·검증.
- **통합**: 종목 등록 → 검증 → 데일리 배치 → 점검결과 → 통계 흐름 e2e (mock GPT).
- **비용 회귀**: 동일 종목 N유저 시 web_search 콜 = 종목 수인지 검증 (디둡 보증).

---

## 14. 단계별 롤아웃

| Phase | 범위 |
|-------|------|
| **1 (MVP)** | 종목 등록, 가설 등록+GPT검증, 캘린더, 데일리 2단계 점검, 히스토리, GPT 웹검색만, Supabase, Expo |
| **2** | 국내 종목 데이터 보강(Finnhub/KIS earnings calendar), 구독 결제, 반복 실패 패턴 분석 고도화 |
| **3** | 정확도용 시세/뉴스 API 통합(Q2-B), 다국어, 위젯 확장 |

---

## 15. 미해결 / 배포 전 확인

1. OpenAI web_search 현재 단가 확인 → 종목수 상한/과금 티어 확정.
2. 국내(KRX) 종목 한국어 웹검색 품질 실측.
3. ~~앱 최종 이름 확정~~ → **WhyBuy (왜샀나)** 확정. 단 상표 검색(KIPRIS/앱스토어) 필요.
4. Supabase free tier 한도 vs 예상 트래픽.
