-- Screen SC11 — 잠시 나가기 · 지원 그만두기 (Hire 와 같은 Supabase 프로젝트)
-- 여러 번 실행해도 안전하다.
--   · 잠시 나간 마지막 시각·횟수(left_at·leave_count) — 담당자에게 보인다
--   · 지원을 그만둔 시각·이유·지운 영상 수(withdrawn_at·withdraw_reason·withdrawn_videos) — 영상·글은 그 자리에서 지운다
--   · 삭제 이유에 'withdrawn' 추가 · 후보자 요청 종류에 'withdraw'(담당자에게 알리는 한 줄) 추가

alter table screen_interviews add column if not exists left_at         timestamptz;
alter table screen_interviews add column if not exists leave_count     integer not null default 0;
alter table screen_interviews add column if not exists withdrawn_at    timestamptz;
alter table screen_interviews add column if not exists withdraw_reason text;
alter table screen_interviews add column if not exists withdrawn_videos integer not null default 0;

alter table screen_interviews drop constraint if exists screen_interviews_withdraw_reason;
alter table screen_interviews add constraint screen_interviews_withdraw_reason
  check (withdraw_reason is null or withdraw_reason in ('offer','schedule','fit','none'));

alter table screen_interviews drop constraint if exists screen_interviews_purge_reason;
alter table screen_interviews add constraint screen_interviews_purge_reason
  check (purge_reason is null or purge_reason in ('retention','request','staff','withdrawn'));

alter table screen_requests drop constraint if exists screen_requests_kind_check;
alter table screen_requests add constraint screen_requests_kind_check
  check (kind in ('human','explain','delete','withdraw'));

select 'screen 나가기·그만두기 칸 준비 완료' as result;
