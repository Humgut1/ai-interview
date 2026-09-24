-- Screen SC1 — 서버 저장 표 5개 (Hire 와 같은 Supabase 프로젝트, 이름은 screen_ 으로 시작)
-- 여러 번 실행해도 안전하다(if not exists).
-- 행 보안(RLS)을 켜고 정책은 두지 않는다 → 브라우저 열쇠(anon)로는 한 줄도 못 읽고,
-- Screen 서버(service_role)만 읽고 쓴다. 후보자 화면에 평가 기준이 새지 않게 하려는 것.

create table if not exists screen_jobs (
  id               text primary key,
  title            text not null,
  description      text not null default '',
  questions        jsonb not null default '[]'::jsonb,   -- 질문·평가 기준·비중·후속 질문 횟수 (순서 = 배열 순서)
  status           text not null default '진행중' check (status in ('진행중','마감')),
  hire_position_id text,                                  -- Hire 공고 id (SC4 에서 채움)
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists screen_interviews (
  id                text primary key,
  job_id            text not null references screen_jobs(id) on delete cascade,
  token             text not null unique,                 -- 링크에 들어가는 추측 어려운 값
  label             text not null,                        -- 후보자 A, B … (실명 안 씀)
  hire_candidate_id text,                                 -- Hire 후보자 id (SC4 에서 채움)
  stage             text not null default '링크발급' check (stage in ('링크발급','진행중','제출완료')),
  question_index    integer not null default 0,
  follow_up_count   integer not null default 0,
  consent_at        timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  expires_at        timestamptz not null,
  ai_summary        text,                                 -- 채점 AI 한 줄 요약 (SC2)
  scored_at         timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists screen_interviews_job on screen_interviews(job_id);

create table if not exists screen_messages (
  id           text primary key,
  interview_id text not null references screen_interviews(id) on delete cascade,
  seq          integer not null,                          -- 대화 순서. 같은 번호 두 번 못 들어감 = 두 번 눌러도 한 번만 기록
  role         text not null check (role in ('ai','candidate')),
  kind         text not null check (kind in ('intro','question','followUp','answer','closing')),
  question_id  text,
  text         text not null,
  at           timestamptz not null default now(),
  unique (interview_id, seq)
);

create table if not exists screen_scores (
  interview_id text not null references screen_interviews(id) on delete cascade,
  question_id  text not null,
  score        integer not null check (score between 0 and 100),
  rationale    text not null,
  evidence     jsonb not null default '[]'::jsonb,        -- [{messageId, quote}] quote 는 답변 원문 그대로
  follow_ups   jsonb not null default '[]'::jsonb,        -- 대면 면접에서 더 물어볼 것
  model        text,
  rule_version text,
  created_at   timestamptz not null default now(),
  primary key (interview_id, question_id)
);

create table if not exists screen_reviews (
  interview_id text primary key references screen_interviews(id) on delete cascade,
  status       text not null default '미검토' check (status in ('미검토','검토중','검토완료')),
  overrides    jsonb not null default '{}'::jsonb,        -- 문항별 담당자 점수 (AI 점수는 그대로 둔다)
  memos        jsonb not null default '{}'::jsonb,
  overall_memo text not null default '',
  reviewer     text,
  updated_at   timestamptz not null default now()
);

alter table screen_jobs       enable row level security;
alter table screen_interviews enable row level security;
alter table screen_messages   enable row level security;
alter table screen_scores     enable row level security;
alter table screen_reviews    enable row level security;

select 'screen 표 5개 준비 완료' as result;
