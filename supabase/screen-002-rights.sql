-- Screen SC4.5 — 후보자 권리 (Hire 와 같은 Supabase 프로젝트)
-- 여러 번 실행해도 안전하다(if not exists).
--   · 동의한 안내문 판(consent_version)
--   · 후보자가 AI 대신 담당자 면접을 요청한 시각(opted_out_at)
--   · 보관 기간이 지나거나 삭제 요청으로 지운 시각·이유(purged_at·purge_reason) — 줄은 남기고 대화·점수·검토만 지운다
--   · 후보자 요청(screen_requests): 담당자 면접 / 결과 설명 / 기록 삭제
--   · 회사 설정(screen_settings): 보관 기간(일) 등

alter table screen_interviews add column if not exists consent_version text;
alter table screen_interviews add column if not exists opted_out_at    timestamptz;
alter table screen_interviews add column if not exists purged_at       timestamptz;
alter table screen_interviews add column if not exists purge_reason    text;

do $$ begin
  alter table screen_interviews add constraint screen_interviews_purge_reason
    check (purge_reason is null or purge_reason in ('retention','request','staff'));
exception when duplicate_object then null; end $$;

create table if not exists screen_requests (
  id           text primary key,
  interview_id text not null references screen_interviews(id) on delete cascade,
  kind         text not null check (kind in ('human','explain','delete')),
  note         text not null default '',
  status       text not null default 'open' check (status in ('open','done')),
  created_at   timestamptz not null default now(),
  handled_at   timestamptz,
  handled_by   text
);
create index if not exists screen_requests_interview on screen_requests(interview_id);
-- 같은 요청은 처리되기 전까지 한 건만 (두 번 눌러도 한 건)
create unique index if not exists screen_requests_one_open
  on screen_requests(interview_id, kind) where status = 'open';

create table if not exists screen_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into screen_settings (key, value) values ('retention_days', '180')
  on conflict (key) do nothing;

alter table screen_requests enable row level security;
alter table screen_settings enable row level security;

select 'screen 후보자 권리 표 준비 완료' as result;
