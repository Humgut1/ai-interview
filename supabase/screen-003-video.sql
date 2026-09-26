-- Screen SC6 — 녹화 영상 면접 (Hire 와 같은 Supabase 프로젝트)
-- 여러 번 실행해도 안전하다.
--   · 공고마다 면접 방식(video / text)과 영상 규칙(답변 시간·준비 시간·다시 찍기)
--   · 면접마다 지금 질문에서 녹화를 시작한 횟수(take_count)
--   · 답변마다 녹화 파일 위치·길이·몇 번째 녹화·받아 적기 상태
--   · 녹화 파일 저장 칸 screen-videos (비공개, 한 파일 50MB, webm/mp4 만)

alter table screen_jobs add column if not exists mode  text  not null default 'text';
alter table screen_jobs add column if not exists video jsonb not null default '{"answerSec":120,"prepSec":30,"retakes":1}'::jsonb;

do $$ begin
  alter table screen_jobs add constraint screen_jobs_mode check (mode in ('video','text'));
exception when duplicate_object then null; end $$;

alter table screen_interviews add column if not exists take_count int not null default 0;

alter table screen_messages add column if not exists media_path text;
alter table screen_messages add column if not exists media_sec  numeric;
alter table screen_messages add column if not exists media_take int;
alter table screen_messages add column if not exists stt_status text;

do $$ begin
  alter table screen_messages add constraint screen_messages_stt_status
    check (stt_status is null or stt_status in ('pending','done','failed'));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screen-videos', 'screen-videos', false, 52428800, array['video/webm','video/mp4'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

select 'screen 영상 면접 준비 완료' as result;
