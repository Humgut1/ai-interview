-- Screen SC7 — 받아 적기 (Hire 와 같은 Supabase 프로젝트)
-- 여러 번 실행해도 안전하다.
--   · 영상 답변마다 받아 적기 작업 번호·보낸 횟수·실패 사유·토막별 시각·마지막 처리 시각
--   · 받아 적은 글은 원래 있던 text 칸에 들어간다(채점이 글 면접과 같은 칸을 읽도록)

alter table screen_messages add column if not exists stt_job      text;
alter table screen_messages add column if not exists stt_tries    int not null default 0;
alter table screen_messages add column if not exists stt_error    text;
alter table screen_messages add column if not exists stt_segments jsonb;
alter table screen_messages add column if not exists stt_at       timestamptz;

-- 받아 적기 대기 줄을 빨리 찾도록
create index if not exists screen_messages_stt_pending
  on screen_messages (at) where stt_status = 'pending';

select 'screen 받아 적기 준비 완료' as result;
