# WhyBuy (왜샀나) — 디자인 시스템 (실서비스 안전 · Binance-inspired)

- **작성일**: 2026-07-09
- **기반**: Binance 디자인 분석 문서 (룩앤필 참고)
- **원칙**: 시각적 DNA는 최대한 유지하되, 상표·라이선스·trade-dress 리스크 요소는 전부 교체.
- **대상**: React Native (Expo) 모바일 앱. 원본은 웹(탑네비/푸터/1280px)이라 모바일로 변환.

---

## 0. 법적 교체 요약 (원본 → 우리)

| 원본 (사용 금지) | 우리 (안전) | 사유 |
|---|---|---|
| BinanceNova 폰트 | **Inter** | 전용 라이선스 폰트 → OFL 오픈 |
| BinancePlex 폰트 | **IBM Plex Mono** | 전용 라이선스 폰트 → OFL 오픈, "Plex" 성격 유사 |
| "BINANCE" 워드마크/이름 | **WhyBuy (왜샀나)** | 등록 상표 |
| #FCD535 (Binance Yellow) | **#F5B301 (Signal Gold)** | 정확 색 복제 회피, 유사 에너지 유지 |
| "FUNDS ARE SAFU" 등 카피 | 자체 카피 | 고유 마케팅 문구 |
| 코인/트로피 일러스트 | 자체 에셋 | 저작물 |

> 색상 단일값은 상표보호가 어렵지만 "전체 조합 모방"이 trade-dress 리스크. 카테고리·이름·폰트·로고가 모두 다르므로 위험은 낮으나, 액센트를 lemon-yellow(#FCD535)에서 warm gold(#F5B301)로 이동해 추가 방어.

---

## 1. 컬러 토큰

### 브랜드 & 액센트
```
primary            #F5B301   Signal Gold — 모든 primary CTA, 브랜드 강조, 핵심 수치
primary-active     #D99A00   press/hover
primary-disabled   #3a3320   dark 캔버스 위 비활성 CTA
on-primary         #17191c   gold 위 텍스트 (검정)
```
- Signal Gold는 **유일한 브랜드 색**. primary CTA·핵심 수치·브랜드마크에만. 절대 본문/장식/대면적 채움 금지 — 희소성이 힘.
- 세컨더리 브랜드 색 없음.

### 캔버스 & 서페이스
```
# Dark (기본 — 마케팅/대시보드/점검)
canvas-dark            #0b0e11   페이지 바닥 (근검정, 순검정 아님)
surface-card-dark      #1e2329   카드, 시트, 세컨더리 버튼
surface-elevated-dark  #2b3139   중첩 카드, 차트 패널, hover

# Light (거래성 폼 — 종목/가설 입력, 설정)
canvas-light           #ffffff
surface-soft-light     #fafafa   비활성/보조 면
surface-strong-light   #f5f5f5   입력 배경(muted)
```

### 헤어라인 & 보더
```
hairline-on-dark    #2b3139   dark 위 1px 구분선 (surface-elevated와 동일 — 선이 아닌 면의 단차)
hairline-on-light   #eaecef   light 위 1px 구분선
border-strong       #cdd1d6   비활성 세컨더리 보더
```

### 텍스트
```
ink            #181a20   light 위 최강 텍스트 / 헤드라인
body           #eaecef   dark 위 본문 (순백 아님, 약간 쿨)
body-on-light  #181a20   light 위 본문 (= ink)
muted          #707a8a   캡션, 컬럼헤더, 보조링크 (양 모드 공용)
muted-strong   #929aa5   강조 라벨
on-dark        #ffffff   dark 위 고대비 헤드라인
```

### 트레이딩 시맨틱 (가격 방향 — 양 모드 공용)
```
trading-up     #0ecb81   상승 (텍스트 색으로만, 카드 배경 금지)
trading-down   #f6465d   하락 (동일 규칙)
```
> 이 앱에서 재해석: 가격 상승/하락 + **가설 점검 신호**에도 사용.
> `trading-up` = 가설 강화/유지 우호, `trading-down` = 가설 약화 신호. "성공/에러" 일반 상태엔 쓰지 않음.

### 상태 색 (점검 의견 — Thesis 고유 추가)
```
status-hold     #0ecb81   유지 (= trading-up)
status-watch    #F5B301   관찰 (= primary gold)
status-reduce   #f6b73c   축소 (앰버)
status-exit     #f6465d   청산 (= trading-down)
```

### Info / Focus
```
info        #3b82f6   info 배지
info-ring   #3b82f6   입력 포커스 링 (0 0 0 2px @50% alpha)
```

---

## 2. 타이포그래피

- **본문/디스플레이**: `Inter` (Expo: `@expo-google-fonts/inter`)
- **숫자/금융데이터**: `IBM Plex Mono` (Expo: `@expo-google-fonts/ibm-plex-mono`) — 가격·수량·%·통계·카운터
- 폴백: `-apple-system, Roboto, sans-serif` / 숫자 폴백 `ui-monospace, monospace`
- 숫자엔 항상 tabular figures. Inter로 숫자 쓸 때도 `fontVariant: ['tabular-nums']`.

**모바일 스케일** (원본 웹 대비 축소 — hero 64px는 폰에서 안 맞음):

| 토큰 | 크기 | 굵기 | 행간 | 자간 | 폰트 | 용도 |
|---|---|---|---|---|---|---|
| hero-display | 34 | 700 | 1.15 | -0.5 | Inter | 온보딩 h1 |
| display-lg | 28 | 700 | 1.15 | -0.3 | Inter | 브랜드 클레임 |
| display-md | 24 | 600 | 1.2 | -0.2 | Inter | 섹션 헤드 |
| display-sm | 20 | 600 | 1.25 | 0 | Inter | 카드밴드 헤드 |
| title-lg | 18 | 600 | 1.3 | 0 | Inter | 서브섹션 |
| title-md | 16 | 600 | 1.35 | 0 | Inter | 카드 타이틀 |
| title-sm | 14 | 600 | 1.4 | 0 | Inter | 배지·라벨 |
| number-display | 32 | 700 | 1.1 | -0.3 | Plex Mono | 큰 수치 (평가액·적중률) |
| number-md | 15 | 500 | 1.4 | 0 | Plex Mono | 표 가격/셀 |
| number-sm | 13 | 500 | 1.4 | 0 | Plex Mono | 인라인 가격/% |
| body-md | 14 | 400 | 1.5 | 0 | Inter | 기본 본문 |
| body-sm | 13 | 400 | 1.5 | 0 | Inter | 보조/약관 |
| caption | 12 | 500 | 1.4 | 0 | Inter | 메타 라벨 |
| button | 15 | 600 | 1 | 0 | Inter | 버튼 라벨(모바일 탭 타겟 고려 약간 키움) |
| nav-link | 12 | 500 | 1.3 | 0 | Inter | 탭바 라벨 |

- 디스플레이 굵기 700 유지 (금융앱은 수치가 한눈에 읽혀야). 400으로 안 낮춤.
- 숫자는 무조건 Plex Mono. 본문에 Plex, 숫자에 Inter 섞지 않음.

---

## 3. Radius / Spacing

```
rounded:  xs 2 · sm 4 · md 6 · lg 8 · xl 12 · pill 9999 · full 9999
spacing:  xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · section 56(모바일)
```
- 버튼 `md`(6) · 입력/카드 `lg`(8) · 큰 카드컨테이너 `xl`(12) · 주요 CTA `pill`.
- 섹션 리듬: 모바일 세로 밴드 간 56px (웹 80px에서 축소).
- 카드 내부 패딩 `lg`(24), 밀집 행 `sm~md`(12~16).

---

## 4. 테마 모드

- **Dark (기본)**: 종목 목록, 점검 결과, 히스토리, 캘린더, 온보딩.
- **Light (거래성)**: 종목/가설 입력 폼, 설정, 결제.
- 두 모드 공유: Signal Gold CTA, 트레이딩 green/red, 헤어라인.
- 캔버스·서페이스·텍스트 톤만 뒤집힘. 버튼(gold+검정 텍스트)은 양 모드 동일.

---

## 5. 컴포넌트 (RN 모바일 변환)

원본 웹 컴포넌트 → 모바일 대응:

| 원본(웹) | 우리(모바일) |
|---|---|
| top-nav (64px 가로 메뉴) | **하단 탭바** (종목/일정/점검/히스토리) + 화면 상단 헤더 |
| footer-light | 없음 (모바일 앱은 푸터 없음). 약관/면책은 설정 화면 |
| markets-table-card (5컬럼 표) | **종목 카드 리스트** — 세로 스크롤, 카드당 종목1 |
| search-input-on-dark | 상단 검색 시트 |

핵심 컴포넌트:

- **button-primary** — bg `primary`, text `on-primary`(검정), radius `md`, 높이 48(모바일 탭 타겟), 패딩 14×24, type `button`. press → `primary-active`, disabled → `primary-disabled`.
- **button-primary-pill** — 온보딩/주요 액션. radius `pill`, 패딩 16×32.
- **button-secondary-on-dark** — bg `surface-card-dark`, text `on-dark`, radius `md`.
- **button-secondary-on-light** — bg `canvas-light` + 1px `hairline-on-light`, text `ink`.
- **text-link** — 투명, text `primary`, 밑줄 없음.
- **holding-card** (신규, markets-row 계승) — bg `surface-card-dark`, radius `xl`, 패딩 `lg`. 좌: 종목아이콘 32 + 심볼(Inter) / 우상: 가격 `number-md`(Plex) + 변화 `price-up/down-cell` / 우하: **가설 상태 배지**(status-* 색).
- **price-up-cell / price-down-cell** — 투명 bg, text `trading-up/down`, `number-md` Plex, 삼각 화살표 동반.
- **status-badge** (신규) — 점검 의견(유지/관찰/축소/청산). 작은 pill, `status-*` 색 텍스트 + 옅은 동색 배경(≤12% alpha). 카드 대면적 채움 금지.
- **thesis-form-card** (신규, light) — 가설 입력. bg `canvas-light`, radius `lg`, 패딩 `lg`. `text-input-on-light` 필드들 + gold CTA.
- **check-result-card** (신규, dark) — 데일리 점검 결과. bg `surface-card-dark`, radius `xl`. 상단 status-badge, 본문 근거(body-md), 참조 링크(text-link).
- **calendar-row** (신규) — 확인 일정 행. 투명 bg, 12px 세로 패딩, 하단 hairline. 좌: 날짜(Plex number-sm) / 중: 이벤트 라벨(title-sm) / 우: 종목칩 + `★`(주요 확인일=primary gold).
- **stat-callout** — 통계 큰 수치. 투명 bg, text `primary`, `number-display` Plex (적중률·평균유지기간).
- **text-input-on-light** — bg `canvas-light`, 1px `hairline-on-light`, radius `md`, 높이 48. 포커스 시 info-ring.
- **tab-bar** (신규) — bg `canvas-dark`, 활성 아이콘/라벨 `primary`, 비활성 `muted`. 4탭.

---

## 6. Elevation

- 철학: **플랫 면 + 컬러블록 분리**. 무거운 그림자/글래스모피즘 금지. 깊이는 `canvas-dark`↔`surface-card-dark` 명도차로.
- 헤어라인 1px = 입력/표 구분/행 분리.
- 포커스 링 `0 0 0 2px info-ring @50%`.
- 그라디언트 캔버스(메시/오로라/글로우) 금지 — 트레이딩 플랫폼 느낌 흐려짐.

---

## 7. Do / Don't

**Do**
- Signal Gold는 primary 액션·브랜드·핵심 수치에만. 희소하게.
- 모든 숫자 IBM Plex Mono + tabular.
- 화면 의도로 모드 선택: dark=조회/대시보드, light=입력폼.
- 트레이딩 green/red는 가격방향·가설신호 전용.

**Don't**
- 두 번째 브랜드 색 추가 금지.
- gold를 본문/대면적 채움에 쓰지 마.
- trading-up/down을 카드 배경으로 쓰지 마 (텍스트/배지만).
- 디스플레이 굵기 700 → 400 낮추지 마.
- **Binance 폰트/워드마크/카피/색(#FCD535) 절대 재사용 금지.**
- button-primary 텍스트를 흰색으로 반전 금지 (검정 유지, 대비).

---

## 8. 면책·톤 (스펙 §11 연동)
- "매수/매도하세요" 카피 금지 → "가설 대비 변화 있음/없음" 서술.
- 점검 결과·온보딩에 면책 문구 상시 노출.
- 톤: 자문이 아닌 **판단 보조·기록**.

---

## 9. Expo 폰트 로딩 (구현 메모)
```
expo install @expo-google-fonts/inter @expo-google-fonts/ibm-plex-mono expo-font
```
- Inter: Regular/Medium/SemiBold/Bold
- IBM Plex Mono: Medium/Bold
- 앱 부팅 시 `useFonts`로 로드, 스플래시 유지.
