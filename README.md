# WhyBuy (왜샀나)

투자 가설을 기록하면 AI가 합당성을 검증하고, 확인 일정을 캘린더로 보여주고, 하루 1회 유지/관찰/축소/청산 관점으로 점검해주는 앱.
투자 자문이 아닌 판단 기록·보조 도구입니다.

## 로컬 실행
1. `npm install`
2. `.env.example` → `.env` 복사, Supabase URL/anon key 입력 (필수 — 아래 Supabase 셋업 참고)
3. `npx expo start`
4. iOS 시뮬레이터 `i`, Android `a`, 폰은 Expo Go로 QR 스캔

## Supabase 셋업
1. supabase.com 프로젝트 생성 → Settings → API에서 URL/anon key 복사
2. Authentication → Providers → **Anonymous** 활성화
3. `npx supabase link --project-ref <ref>` 후 `npx supabase db push` (migrations 적용)
4. Edge Functions 배포: `npx supabase functions deploy gpt-verify daily-batch`
5. 시크릿 설정:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-... BATCH_SECRET=$(openssl rand -hex 16)
   ```
   - 모델 조정(선택): `OPENAI_MODEL_SCAN`(기본 gpt-5), `OPENAI_MODEL_EVAL`(기본 gpt-5-mini) — **배포 전 최신 모델명/단가 확인**
   - 비용 상한(선택): `DAILY_WEBSEARCH_CAP` (기본 200콜/일)
6. `supabase/migrations/0002_cron.sql`의 `{{PROJECT_REF}}` / `{{BATCH_SECRET}}` 치환 후 대시보드 SQL Editor에서 실행 (pg_cron 스케줄 등록)

## 아키텍처 요약
- **Expo(RN)** 앱 → **Supabase** (Auth·Postgres·Edge Functions·pg_cron) → **OpenAI Responses API + web_search**
- GPT 호출은 전부 Edge Function에서만 (API 키 클라이언트 노출 없음)
- 데일리 점검 2단계: Stage1 종목당 1회 웹검색(공유 캐시) → Stage2 가설당 저가모델 평가(변화없음이면 GPT 미호출)
- 비용은 유저 수가 아닌 **distinct 종목 수**에 비례

## 테스트
- 앱: `npm test` (jest-expo) · 타입: `npx tsc --noEmit`
- Edge Functions: `cd supabase/functions && deno test --allow-env --config deno.json tests/`

## 배포 전 체크리스트
- [ ] OpenAI web_search 현재 단가 확인 → `DAILY_WEBSEARCH_CAP` 조정
- [ ] KRX 종목 한국어 웹검색 품질 실측
- [ ] WhyBuy/왜샀나 상표 검색 (KIPRIS, 앱스토어)
- [ ] 면책 문구 온보딩 노출 확인
- [ ] EAS Build/Submit 설정 (스토어 배포 시)
