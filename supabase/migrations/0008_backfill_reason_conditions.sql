-- 기존 가설 백필: 저장된 검증 결과의 논점(reason_reviews)을 감시 행으로 생성
-- (신규 검증부터는 gpt-verify가 자동 생성 — 이 마이그레이션은 과거 데이터용 1회성)
insert into public.check_conditions (thesis_id, label, reason_label, event_type, next_check_date, source)
select t.id, r->>'reason', r->>'reason', 'custom', null, 'ai'
from public.theses t
cross join lateral jsonb_array_elements(t.soundness_review->'reason_reviews') as r
where t.status != 'closed'
  and t.soundness_review is not null
  and jsonb_typeof(t.soundness_review->'reason_reviews') = 'array'
  and not exists (
    select 1 from public.check_conditions c
    where c.thesis_id = t.id
      and c.label = r->>'reason'
      and c.status = 'open'
  );
