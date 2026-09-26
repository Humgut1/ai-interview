import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  appendAnswer,
  applyDecision,
  decideNextStep,
  startSession,
} from "@/lib/interview";
import { estimateMinutes } from "@/lib/rubric";
import type {
  Candidate,
  CandidateRow,
  CandidateStage,
  ChatMessage,
  InterviewPhase,
  InterviewReport,
  InterviewSession,
  InterviewSetup,
  Job,
  JobSummary,
  Question,
  QuestionScore,
  RecruiterReview,
  ReviewStatus,
} from "@/lib/types";
import { cleanVideoRules } from "@/lib/types";

/**
 * Screen 의 저장·조회는 전부 여기서 한다(서버 전용).
 * 화면(페이지)과 서버 함수는 이 파일만 부르고, 표 이름·칸 이름은 밖으로 새지 않는다.
 */

/** 면접 링크 유효 기간 */
export const INTERVIEW_TTL_DAYS = 14;
/** 답변 한 번의 최대 글자 수. 이보다 길면 잘라서 저장한다. */
export const MAX_ANSWER_CHARS = 4000;
/** 영상 답변을 담는 비공개 저장 칸(버킷). 폴더 = 면접 id. */
export const VIDEO_BUCKET = "screen-videos";

/* eslint-disable @typescript-eslint/no-explicit-any */

function hex(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

/** 링크에 들어가는 값. 이것만 알면 면접에 들어갈 수 있으므로 길고 추측하기 어렵게. */
function newToken() {
  return randomBytes(18).toString("base64url");
}

/**
 * DB 시각(UTC)을 한국 시각 ISO 문자열로 바꾼다.
 * 화면은 문자열에서 날짜·시각을 그대로 잘라 읽으므로(서버·브라우저 시간대 차이 방지) +09:00 으로 맞춘다.
 */
export function toKst(value: string | null | undefined) {
  if (!value) return "";
  const ms = new Date(value).getTime() + 9 * 3600_000;
  return new Date(ms).toISOString().slice(0, 19) + "+09:00";
}

function check(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/* ── 공고 ───────────────────────────── */

function toJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    questions: (row.questions ?? []) as Question[],
    // 영상 면접 칸이 생기기 전의 공고는 글 면접
    mode: row.mode === "video" ? "video" : "text",
    video: cleanVideoRules(row.video),
  };
}

export async function createJob(
  job: Job,
  createdBy?: string,
  hirePositionId?: string
) {
  const id = `job_${hex(5)}`;
  const { error } = await db().from("screen_jobs").insert({
    id,
    title: job.title.trim(),
    description: job.description.trim(),
    questions: job.questions,
    mode: job.mode === "video" ? "video" : "text",
    video: cleanVideoRules(job.video),
    created_by: createdBy ?? null,
    hire_position_id: hirePositionId ?? null,
  });
  check(error, "공고 저장");
  return id;
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await db()
    .from("screen_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  check(error, "공고 조회");
  return data ? toJob(data) : null;
}

function summaryOf(row: any, interviews: any[]): JobSummary {
  const times = [
    row.created_at,
    ...interviews.flatMap((iv) => [iv.created_at, iv.completed_at]),
  ].filter(Boolean) as string[];
  const last = times.sort().at(-1) ?? row.created_at;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: toKst(row.created_at),
    questionCount: (row.questions ?? []).length,
    lastActivityAt: toKst(last),
  };
}

export async function listJobs(): Promise<
  { job: JobSummary; candidates: Candidate[] }[]
> {
  const { data: jobs, error } = await db()
    .from("screen_jobs")
    .select("*")
    .order("created_at", { ascending: false });
  check(error, "공고 목록");
  const ids = (jobs ?? []).map((job) => job.id);
  const interviews = ids.length ? await interviewRows(ids) : [];
  return (jobs ?? []).map((row) => {
    const mine = interviews.filter((iv) => iv.job_id === row.id);
    return { job: summaryOf(row, mine), candidates: mine.map(toCandidate) };
  });
}

export async function getJobSummary(id: string) {
  const { data, error } = await db()
    .from("screen_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  check(error, "공고 조회");
  if (!data) return null;
  const interviews = await interviewRows([id]);
  return {
    job: summaryOf(data, interviews),
    candidates: interviews.map(toCandidate),
  };
}

/* ── 면접(후보자 한 명) ───────────────────────────── */

async function interviewRows(jobIds: string[]) {
  const { data, error } = await db()
    .from("screen_interviews")
    .select("*, screen_reviews(status), screen_scores(question_id, score), screen_requests(status)")
    .in("job_id", jobIds)
    .order("created_at", { ascending: true });
  check(error, "면접 목록");
  return data ?? [];
}

/** 링크 발급·조회 결과 한 줄. 점수는 채점(SC2)이 끝난 면접에만 있다. */
function toCandidate(row: any): Candidate {
  const review = Array.isArray(row.screen_reviews)
    ? row.screen_reviews[0]
    : row.screen_reviews;
  const scores = (row.screen_scores ?? []) as { score: number }[];
  const aiScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : undefined;
  const submitted = row.stage === "제출완료";
  const purged = Boolean(row.purged_at);
  const openRequests = ((row.screen_requests ?? []) as { status: string }[]).filter(
    (r) => r.status === "open"
  ).length;
  return {
    id: row.id,
    label: row.label,
    token: row.token,
    invitedAt: toKst(row.created_at),
    stage: row.stage as CandidateStage,
    ...(row.opted_out_at ? { optedOut: true } : {}),
    ...(purged ? { purged: true } : {}),
    ...(openRequests ? { openRequests } : {}),
    ...(submitted && !purged
      ? {
          reportId: row.id,
          completedAt: toKst(row.completed_at),
          reviewStatus: (review?.status ?? "미검토") as ReviewStatus,
          ...(aiScore === undefined ? {} : { aiScore }),
        }
      : {}),
  };
}

function labelFor(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const round = Math.floor(index / alphabet.length);
  return `후보자 ${alphabet[index % alphabet.length]}${round > 0 ? round + 1 : ""}`;
}

/** 면접 링크를 하나 만든다. 라벨은 그 공고 안에서 발급 순서대로 A, B, C… */
export async function issueInterview(
  jobId: string,
  hireCandidateId?: string
): Promise<Candidate> {
  const { count, error: countError } = await db()
    .from("screen_interviews")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  check(countError, "면접 수 확인");

  const expires = new Date(Date.now() + INTERVIEW_TTL_DAYS * 86400_000);
  const { data, error } = await db()
    .from("screen_interviews")
    .insert({
      id: `iv_${hex(6)}`,
      job_id: jobId,
      token: newToken(),
      label: labelFor(count ?? 0),
      hire_candidate_id: hireCandidateId ?? null,
      expires_at: expires.toISOString(),
    })
    .select("*")
    .single();
  check(error, "면접 링크 발급");
  return toCandidate(data);
}

/* ── 후보자 화면 ───────────────────────────── */

function phaseOf(stage: string): InterviewPhase {
  if (stage === "제출완료") return "done";
  if (stage === "진행중") return "chat";
  return "consent";
}

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    kind: row.kind,
    text: row.text,
    at: toKst(row.at),
    ...(row.question_id ? { questionId: row.question_id } : {}),
    ...(row.media_path
      ? {
          media: {
            path: row.media_path,
            seconds: row.media_sec ?? 0,
            take: row.media_take ?? 1,
          },
        }
      : {}),
    ...(row.stt_status ? { stt: row.stt_status } : {}),
  };
}

/** 후보자에게 내려보낼 질문. 평가 기준(criteria)과 비중은 여기서 떼어 낸다. */
function setupOf(token: string, job: Job): InterviewSetup {
  return {
    token,
    jobTitle: job.title,
    estimatedMinutes: estimateMinutes(job.questions, job.mode, job.video),
    questions: job.questions.map((q) => ({
      id: q.id,
      text: q.text,
      maxFollowUps: q.maxFollowUps,
    })),
    mode: job.mode,
    video: job.video,
  };
}

export type InterviewLookup =
  | { state: "ok"; setup: InterviewSetup; session: InterviewSession }
  | { state: "missing" }
  | { state: "expired" }
  /** 담당자 면접을 요청했거나 기록을 지운 면접 — 더 진행할 수 없다 */
  | { state: "closed" };

async function loadByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { data, error } = await db()
    .from("screen_interviews")
    .select("*, screen_jobs(*)")
    .eq("token", token)
    .maybeSingle();
  check(error, "면접 조회");
  if (!data || !data.screen_jobs) return null;
  const { data: msgs, error: msgError } = await db()
    .from("screen_messages")
    .select("*")
    .eq("interview_id", data.id)
    .order("seq", { ascending: true });
  check(msgError, "대화 조회");
  const job = toJob(data.screen_jobs);
  const session: InterviewSession = {
    token,
    phase: phaseOf(data.stage),
    messages: (msgs ?? []).map(toMessage),
    questionIndex: data.question_index,
    followUpCount: data.follow_up_count,
    takeCount: data.take_count ?? 0,
    ...(data.started_at ? { startedAt: toKst(data.started_at) } : {}),
    ...(data.completed_at ? { completedAt: toKst(data.completed_at) } : {}),
  };
  return { row: data, job, setup: setupOf(token, job), session };
}

export async function lookupInterview(token: string): Promise<InterviewLookup> {
  const found = await loadByToken(token);
  if (!found) return { state: "missing" };
  if (found.row.purged_at || found.row.opted_out_at) return { state: "closed" };
  // 제출을 마친 사람은 기한이 지나도 완료 화면을 본다.
  if (
    found.row.stage !== "제출완료" &&
    new Date(found.row.expires_at).getTime() < Date.now()
  ) {
    return { state: "expired" };
  }
  return { state: "ok", setup: found.setup, session: found.session };
}

/** 새로 생긴 발언만 이어 번호(seq)를 붙여 넣는다. 같은 번호가 이미 있으면 실패 → 두 번 눌러도 한 번만 남는다. */
async function insertMessages(
  interviewId: string,
  before: ChatMessage[],
  after: ChatMessage[]
) {
  const fresh = after.slice(before.length);
  if (fresh.length === 0) return true;
  const { error } = await db()
    .from("screen_messages")
    .insert(
      fresh.map((message, offset) => ({
        id: message.id,
        interview_id: interviewId,
        seq: before.length + offset,
        role: message.role,
        kind: message.kind,
        question_id: message.questionId ?? null,
        text: message.text,
        at: message.at,
        ...(message.media
          ? {
              media_path: message.media.path,
              media_sec: message.media.seconds,
              media_take: message.media.take,
              stt_status: message.stt ?? "pending",
            }
          : {}),
      }))
    );
  if (error?.code === "23505") return false;
  check(error, "대화 저장");
  return true;
}

/** 동의하고 시작. 이미 시작했으면 지금 상태를 그대로 돌려준다. */
export async function startInterview(token: string): Promise<InterviewLookup> {
  const found = await lookupInterview(token);
  if (found.state !== "ok" || found.session.phase !== "consent") return found;

  const loaded = await loadByToken(token);
  if (!loaded) return { state: "missing" };
  const next = startSession(found.setup);
  const now = new Date().toISOString();
  const { data: claimed, error } = await db()
    .from("screen_interviews")
    .update({ stage: "진행중", consent_at: now, started_at: now, consent_version: `${CONSENT_VERSION}/${found.setup.mode}` })
    .eq("id", loaded.row.id)
    .eq("stage", "링크발급")
    .select("id");
  check(error, "면접 시작");
  // 다른 창에서 먼저 시작했으면 그쪽 기록을 쓴다.
  if (claimed?.length) await insertMessages(loaded.row.id, [], next.messages);
  return lookupInterview(token);
}

export type AnswerResult =
  | { ok: true; session: InterviewSession }
  | { ok: false; reason: "missing" | "expired" | "stale" | "closed" };

/**
 * 답변 하나를 받는다. 다음에 무엇을 물을지는 서버가 정한다(브라우저가 정하면 조작할 수 있다).
 * seen = 후보자 화면에 보이던 발언 수. 그 사이 다른 창에서 진행됐으면 기록하지 않고 최신 상태를 돌려준다.
 */
export async function answerInterview(
  token: string,
  text: string,
  seen: number
): Promise<AnswerResult> {
  const answer = text.trim().slice(0, MAX_ANSWER_CHARS);
  const loaded = await loadByToken(token);
  if (!loaded) return { ok: false, reason: "missing" };
  const blocked = blockedReason(loaded, seen);
  if (blocked) return { ok: false, reason: blocked };
  // 영상 면접에 글 답을 끼워 넣지 못하게
  if (!answer || loaded.setup.mode !== "text") return { ok: false, reason: "stale" };
  const { session, setup } = loaded;
  return recordAnswer(
    loaded,
    applyDecision(appendAnswer(session, setup, answer), decideNextStep(session, setup, answer))
  );
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadByToken>>>;
type Blocked = "missing" | "expired" | "stale" | "closed";

/** 답을 받을 수 있는 상태인지. 받을 수 없으면 이유, 받을 수 있으면 null. */
function blockedReason(loaded: Loaded, seen: number): Blocked | null {
  const { row, session } = loaded;
  if (row.stage !== "진행중" || row.opted_out_at || row.purged_at) return "closed";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  if (seen !== session.messages.length) return "stale";
  // 마지막 발언이 AI 질문이어야 답할 차례다
  const last = session.messages[session.messages.length - 1];
  if (!last || last.role !== "ai" || last.kind === "closing") return "stale";
  return null;
}

/** 답변과 그 다음 질문을 저장하고 진행 상태를 옮긴다. 글·영상 공통. */
async function recordAnswer(loaded: Loaded, next: InterviewSession): Promise<AnswerResult> {
  const { row, session } = loaded;
  const token = session.token;
  const saved = await insertMessages(row.id, session.messages, next.messages);
  if (!saved) return { ok: false, reason: "stale" };

  const done = next.phase === "done";
  const { error } = await db()
    .from("screen_interviews")
    .update({
      question_index: next.questionIndex,
      follow_up_count: next.followUpCount,
      take_count: 0,
      ...(done
        ? { stage: "제출완료", completed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", row.id);
  check(error, "진행 상태 저장");
  if (done) {
    const { error: reviewError } = await db()
      .from("screen_reviews")
      .upsert({ interview_id: row.id }, { onConflict: "interview_id", ignoreDuplicates: true });
    check(reviewError, "검토 대기 등록");
  }

  const fresh = await lookupInterview(token);
  return fresh.state === "ok"
    ? { ok: true, session: fresh.session }
    : { ok: false, reason: fresh.state };
}

/* ── 영상 답변 ───────────────────────────── */

/** 올릴 수 있는 녹화 파일 종류. 브라우저마다 만드는 형식이 다르다(크롬 webm, 사파리 mp4). */
const VIDEO_EXT: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4" };

async function videoTurn(token: string, seen: number) {
  const loaded = await loadByToken(token);
  if (!loaded) return { ok: false as const, reason: "missing" as const };
  const blocked = blockedReason(loaded, seen);
  if (blocked) return { ok: false as const, reason: blocked };
  if (loaded.setup.mode !== "video") return { ok: false as const, reason: "stale" as const };
  return { ok: true as const, loaded };
}

export type TakeResult = { ok: true; take: number } | { ok: false; reason: Blocked };

/**
 * 녹화를 시작할 때 부른다. 이 질문에서 몇 번째 녹화인지 센다.
 * 다시 찍기 횟수를 다 썼어도 막지는 않는다(새로고침 등으로 못 올린 경우 후보자가 갇히면 안 된다).
 * 대신 저장되는 답변에 몇 번째 녹화였는지 남겨 담당자가 본다.
 */
export async function beginTake(token: string, seen: number): Promise<TakeResult> {
  const turn = await videoTurn(token, seen);
  if (!turn.ok) return turn;
  const take = turn.loaded.session.takeCount + 1;
  const { error } = await db()
    .from("screen_interviews")
    .update({ take_count: take })
    .eq("id", turn.loaded.row.id);
  check(error, "녹화 횟수 저장");
  return { ok: true, take };
}

export type UploadTicket =
  | { ok: true; url: string; path: string }
  | { ok: false; reason: Blocked | "type" };

/**
 * 녹화 파일을 올릴 한 번짜리 주소를 만든다(2시간 유효).
 * 파일은 브라우저가 Supabase 로 바로 올린다 — 우리 서버를 거치면 크기 제한에 걸린다.
 * 경로 = 면접id/발언번호-무작위.확장자 → 다른 면접 폴더나 다른 차례에 끼워 넣을 수 없다.
 */
export async function prepareUpload(
  token: string,
  seen: number,
  contentType: string
): Promise<UploadTicket> {
  const ext = VIDEO_EXT[contentType.split(";")[0].trim()];
  if (!ext) return { ok: false, reason: "type" };
  const turn = await videoTurn(token, seen);
  if (!turn.ok) return turn;
  const path = `${turn.loaded.row.id}/${seen}-${hex(6)}.${ext}`;
  const { data, error } = await db().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  check(error, "업로드 주소");
  return { ok: true, url: data!.signedUrl, path };
}

const MEDIA_PATH = /^[A-Za-z0-9_-]+\/\d+-[0-9a-f]{12}\.(webm|mp4)$/;

/** 올린 녹화를 답변으로 기록하고 다음 질문을 돌려준다. */
export async function submitVideoAnswer(
  token: string,
  seen: number,
  path: string,
  seconds: number
): Promise<AnswerResult> {
  const turn = await videoTurn(token, seen);
  if (!turn.ok) return turn;
  const { loaded } = turn;
  const { session, setup, row } = loaded;
  // 이 면접·이 차례에 받은 주소로 올린 파일만
  if (!path.startsWith(`${row.id}/${seen}-`) || !MEDIA_PATH.test(path)) {
    return { ok: false, reason: "stale" };
  }
  const { data: there, error } = await db().storage.from(VIDEO_BUCKET).exists(path);
  if (error || !there) return { ok: false, reason: "stale" };

  const sec = Math.max(0, Math.min(setup.video.answerSec + 5, Math.round(Number(seconds) || 0)));
  const media = { path, seconds: sec, take: Math.max(1, session.takeCount) };
  return recordAnswer(
    loaded,
    applyDecision(
      appendAnswer(session, setup, "", media),
      decideNextStep(session, setup, { seconds: sec })
    )
  );
}

/** 면접 폴더의 녹화 파일을 전부 지운다(보관 기간·삭제 요청). 올리다 만 파일까지. */
async function removeMedia(interviewId: string) {
  const bucket = db().storage.from(VIDEO_BUCKET);
  for (let round = 0; round < 20; round++) {
    const { data, error } = await bucket.list(interviewId, { limit: 100 });
    if (error) {
      // 저장 칸을 아직 안 만든 곳(글 면접만 쓰는 곳)은 지울 것도 없다
      if (/not.?found/i.test(error.message)) return;
      throw new Error(`녹화 목록: ${error.message}`);
    }
    const names = (data ?? []).filter((f) => f.id).map((f) => `${interviewId}/${f.name}`);
    if (names.length === 0) return;
    const { error: removeError } = await bucket.remove(names);
    check(removeError, "녹화 삭제");
  }
}

/* ── 담당자 리포트 ───────────────────────────── */

function toScore(row: any): QuestionScore {
  return {
    questionId: row.question_id,
    score: row.score,
    rationale: row.rationale,
    evidence: row.evidence ?? [],
    followUps: row.follow_ups ?? [],
  };
}

export type ReportBundle = {
  report: InterviewReport;
  review: RecruiterReview;
  status: ReviewStatus;
  candidates: CandidateRow[];
  /** 후보자가 낸 요청 중 처리 안 된 것 */
  requests: ScreenRequest[];
};

export async function getReport(id: string): Promise<ReportBundle | null> {
  const { data: row, error } = await db()
    .from("screen_interviews")
    .select("*, screen_jobs(*), screen_reviews(*), screen_scores(*), screen_requests(*)")
    .eq("id", id)
    .maybeSingle();
  check(error, "리포트 조회");
  if (!row || row.stage !== "제출완료" || row.purged_at || !row.screen_jobs) return null;

  const { data: msgs, error: msgError } = await db()
    .from("screen_messages")
    .select("*")
    .eq("interview_id", id)
    .order("seq", { ascending: true });
  check(msgError, "대화 조회");

  const job = toJob(row.screen_jobs);
  const reviewRow = Array.isArray(row.screen_reviews)
    ? row.screen_reviews[0]
    : row.screen_reviews;
  const minutes =
    row.started_at && row.completed_at
      ? Math.max(
          1,
          Math.round(
            (new Date(row.completed_at).getTime() -
              new Date(row.started_at).getTime()) /
              60000
          )
        )
      : 0;

  const siblings = (await interviewRows([job.id]))
    .map(toCandidate)
    .filter((c) => c.stage === "제출완료");

  return {
    report: {
      id,
      jobId: job.id,
      jobTitle: job.title,
      candidateLabel: row.label,
      completedAt: toKst(row.completed_at),
      durationMinutes: minutes,
      summary: row.ai_summary ?? "",
      questions: job.questions,
      scores: (row.screen_scores ?? []).map(toScore),
      transcript: (msgs ?? []).map(toMessage),
    },
    review: {
      overrides: reviewRow?.overrides ?? {},
      memos: reviewRow?.memos ?? {},
      overallMemo: reviewRow?.overall_memo ?? "",
    },
    status: (reviewRow?.status ?? "미검토") as ReviewStatus,
    requests: ((row.screen_requests ?? []) as any[])
      .filter((r) => r.status === "open")
      .map(toRequest),
    candidates: siblings.map((c) => ({
      reportId: c.id,
      candidateLabel: c.label,
      completedAt: c.completedAt ?? "",
      ...(c.aiScore === undefined ? {} : { aiScore: c.aiScore }),
      status: c.reviewStatus ?? "미검토",
      ...(c.finalScore === undefined ? {} : { finalScore: c.finalScore }),
    })),
  };
}

export async function saveReview(
  id: string,
  review: RecruiterReview,
  status: ReviewStatus,
  reviewer?: string
) {
  const { data: row, error: findError } = await db()
    .from("screen_interviews")
    .select("id, stage")
    .eq("id", id)
    .maybeSingle();
  check(findError, "면접 확인");
  if (!row || row.stage !== "제출완료") return false;

  const clean = (map: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(map ?? {}).slice(0, 50));
  const { error } = await db()
    .from("screen_reviews")
    .upsert(
      {
        interview_id: id,
        status,
        overrides: clean(review.overrides),
        memos: clean(review.memos),
        overall_memo: (review.overallMemo ?? "").slice(0, 4000),
        reviewer: reviewer ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "interview_id" }
    );
  check(error, "검토 저장");
  return true;
}

/* ── Hire 연결 (SC4) ───────────────────────────── */

/** Hire 공고 한 건 — 새 직무 만들기 화면이 제목·직무 설명을 채워 넣는 데 쓴다. 같은 Supabase 프로젝트의 Hire 표. */
export async function hirePosition(pid: string) {
  const { data, error } = await db()
    .from("positions")
    .select("id, title, jd")
    .eq("id", pid)
    .maybeSingle();
  check(error, "Hire 공고 조회");
  if (!data) return null;
  // 사내 메모 첫 줄(※ TalentCore 요청 …)은 빼고 넘긴다
  const jd = String(data.jd ?? "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("※"))
    .join("\n")
    .trim();
  return { id: data.id as string, title: String(data.title ?? ""), jd };
}

/** 그 Hire 공고에 연결된 질문 묶음 — 여러 개면 가장 최근 것. */
export async function jobForHirePosition(pid: string) {
  const { data, error } = await db()
    .from("screen_jobs")
    .select("id, title, status, questions")
    .eq("hire_position_id", pid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error, "연결된 공고 조회");
  return data
    ? {
        id: data.id as string,
        title: data.title as string,
        status: data.status as string,
        questionCount: (data.questions ?? []).length as number,
      }
    : null;
}

export interface HireInterview {
  id: string;
  jobId: string;
  jobTitle: string;
  token: string;
  stage: CandidateStage;
  invitedAt: string;
  expiresAt: string;
  expired: boolean;
  completedAt: string | null;
  reviewStatus: ReviewStatus | null;
  /** 채점(SC2) 전에는 없다 */
  aiScore: number | null;
  /** 담당자가 고친 점수가 있으면 반영한 값 */
  finalScore: number | null;
  reviewer: string | null;
  /** 후보자가 AI 대신 담당자 면접을 요청한 시각 */
  optedOutAt: string | null;
  /** 보관 기간·삭제 요청으로 내용을 지운 시각 */
  purgedAt: string | null;
  purgeReason: "retention" | "request" | "staff" | null;
  /** 후보자 요청 (처리 안 된 것 + 처리한 것) */
  requests: ScreenRequest[];
}

/** Hire 후보자 한 명의 Screen 면접들 (최근 것 먼저). */
export async function interviewsForHireCandidate(cid: string): Promise<HireInterview[]> {
  const { data, error } = await db()
    .from("screen_interviews")
    .select(
      "*, screen_jobs(title, questions), screen_reviews(status, overrides, reviewer), screen_scores(question_id, score), screen_requests(*)"
    )
    .eq("hire_candidate_id", cid)
    .order("created_at", { ascending: false });
  check(error, "Hire 후보자 면접 조회");
  const now = Date.now();
  return (data ?? []).map((row: any) => {
    const review = Array.isArray(row.screen_reviews) ? row.screen_reviews[0] : row.screen_reviews;
    const job = Array.isArray(row.screen_jobs) ? row.screen_jobs[0] : row.screen_jobs;
    const scores = (row.screen_scores ?? []) as { question_id: string; score: number }[];
    const questions = (job?.questions ?? []) as Question[];
    const weights = new Map(questions.map((q) => [q.id, Number(q.weight) || 1]));
    const avg = (pick: (s: { question_id: string; score: number }) => number) => {
      if (!scores.length) return null;
      let sum = 0;
      let w = 0;
      for (const s of scores) {
        const k = weights.get(s.question_id) ?? 1;
        sum += pick(s) * k;
        w += k;
      }
      return w ? Math.round(sum / w) : null;
    };
    const overrides = (review?.overrides ?? {}) as Record<string, number>;
    const submitted = row.stage === "제출완료";
    return {
      id: row.id,
      jobId: row.job_id,
      jobTitle: job?.title ?? "",
      token: row.token,
      stage: row.stage as CandidateStage,
      invitedAt: toKst(row.created_at),
      expiresAt: toKst(row.expires_at),
      expired: !submitted && new Date(row.expires_at).getTime() < now,
      completedAt: row.completed_at ? toKst(row.completed_at) : null,
      reviewStatus: submitted ? ((review?.status ?? "미검토") as ReviewStatus) : null,
      aiScore: avg((s) => s.score),
      finalScore: avg((s) => (typeof overrides[s.question_id] === "number" ? overrides[s.question_id] : s.score)),
      reviewer: review?.reviewer ?? null,
      optedOutAt: row.opted_out_at ? toKst(row.opted_out_at) : null,
      purgedAt: row.purged_at ? toKst(row.purged_at) : null,
      purgeReason: row.purge_reason ?? null,
      requests: ((row.screen_requests ?? []) as any[])
        .map(toRequest)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
}

/* ── 후보자 권리 (SC4.5) ───────────────────────────── */

import {
  CONSENT_VERSION,
  DELETE_REQUEST_DAYS,
  RETENTION_DEFAULT,
  RETENTION_MAX,
  RETENTION_MIN,
  type RequestKind,
} from "@/lib/requests";
export {
  CONSENT_VERSION,
  DELETE_REQUEST_DAYS,
  REQUEST_LABEL,
  RETENTION_DEFAULT,
  RETENTION_MAX,
  RETENTION_MIN,
  type RequestKind,
} from "@/lib/requests";

export interface ScreenRequest {
  id: string;
  interviewId: string;
  kind: RequestKind;
  note: string;
  status: "open" | "done";
  createdAt: string;
  handledAt: string | null;
  handledBy: string | null;
}

function toRequest(row: any): ScreenRequest {
  return {
    id: row.id,
    interviewId: row.interview_id,
    kind: row.kind,
    note: row.note ?? "",
    status: row.status,
    createdAt: toKst(row.created_at),
    handledAt: row.handled_at ? toKst(row.handled_at) : null,
    handledBy: row.handled_by ?? null,
  };
}

/** 보관 기간(일). 설정 표가 아직 없거나 값이 이상하면 기본값. */
export async function getRetentionDays(): Promise<number> {
  try {
    const { data, error } = await db()
      .from("screen_settings")
      .select("value")
      .eq("key", "retention_days")
      .maybeSingle();
    if (error || !data) return RETENTION_DEFAULT;
    const n = Number(data.value);
    return Number.isInteger(n) && n >= RETENTION_MIN && n <= RETENTION_MAX ? n : RETENTION_DEFAULT;
  } catch {
    return RETENTION_DEFAULT;
  }
}

export async function saveRetentionDays(days: number, by: string) {
  if (!Number.isInteger(days) || days < RETENTION_MIN || days > RETENTION_MAX) return false;
  const { error } = await db()
    .from("screen_settings")
    .upsert(
      { key: "retention_days", value: String(days), updated_at: new Date().toISOString(), updated_by: by },
      { onConflict: "key" }
    );
  check(error, "보관 기간 저장");
  return true;
}

/** 후보자 화면에 필요한 것: 보관 기간, 이미 낸 요청, 담당자 면접을 요청했는지. */
export interface CandidateRights {
  retentionDays: number;
  /** 해외(Anthropic) AI 가 답변을 처리하는지 — 키가 연결됐을 때만 안내한다 */
  aiAbroad: boolean;
  optedOut: boolean;
  open: RequestKind[];
}

async function rightsOf(row: any): Promise<CandidateRights> {
  const [retentionDays, requests] = await Promise.all([
    getRetentionDays(),
    db().from("screen_requests").select("kind").eq("interview_id", row.id).eq("status", "open"),
  ]);
  return {
    retentionDays,
    aiAbroad: Boolean(process.env.ANTHROPIC_API_KEY),
    optedOut: Boolean(row.opted_out_at),
    open: requests.error ? [] : (requests.data ?? []).map((r: any) => r.kind as RequestKind),
  };
}

export type CandidatePage =
  | { state: "ok"; setup: InterviewSetup; session: InterviewSession; rights: CandidateRights }
  | { state: "missing" }
  | { state: "expired" }
  | { state: "purged" };

/** 후보자 링크 화면 한 장 — 면접 + 권리. */
export async function candidatePage(token: string): Promise<CandidatePage> {
  const found = await loadByToken(token);
  if (!found) return { state: "missing" };
  if (found.row.purged_at) return { state: "purged" };
  const rights = await rightsOf(found.row);
  if (
    found.row.stage !== "제출완료" &&
    !rights.optedOut &&
    new Date(found.row.expires_at).getTime() < Date.now()
  ) {
    return { state: "expired" };
  }
  return { state: "ok", setup: found.setup, session: found.session, rights };
}

export type RequestResult =
  | { ok: true; rights: CandidateRights }
  | { ok: false; reason: "missing" | "purged" | "not-now" };

/**
 * 후보자 요청 한 건. 같은 요청이 처리 전이면 한 건으로 친다(두 번 눌러도 한 건).
 * human = 제출 전에만(AI 면접을 그만두고 담당자 면접으로) · explain = 제출 후 · delete = 언제나.
 */
export async function candidateRequest(
  token: string,
  kind: RequestKind,
  note: string
): Promise<RequestResult> {
  const found = await loadByToken(token);
  if (!found) return { ok: false, reason: "missing" };
  const { row } = found;
  if (row.purged_at) return { ok: false, reason: "purged" };
  const submitted = row.stage === "제출완료";
  if (kind === "human" && submitted) return { ok: false, reason: "not-now" };
  if (kind === "explain" && !submitted) return { ok: false, reason: "not-now" };

  if (kind === "human" && !row.opted_out_at) {
    const { error } = await db()
      .from("screen_interviews")
      .update({ opted_out_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("opted_out_at", null);
    check(error, "담당자 면접 요청");
  }
  const { error } = await db().from("screen_requests").insert({
    id: `rq_${hex(6)}`,
    interview_id: row.id,
    kind,
    note: note.trim().slice(0, 1000),
  });
  if (error?.code !== "23505") check(error, "요청 저장");
  const fresh = await loadByToken(token);
  return fresh ? { ok: true, rights: await rightsOf(fresh.row) } : { ok: false, reason: "missing" };
}

/**
 * 면접 한 건의 내용을 지운다. 줄(누구에게 언제 보냈는지)은 남기고 대화·점수·검토·요청 메모를 지운다.
 * 녹화 파일(저장 칸의 면접 폴더)도 여기서 같이 지운다.
 */
export async function purgeInterview(id: string, reason: "retention" | "request" | "staff") {
  await removeMedia(id);
  for (const table of ["screen_messages", "screen_scores", "screen_reviews"]) {
    const { error } = await db().from(table).delete().eq("interview_id", id);
    check(error, `${table} 삭제`);
  }
  const { error: noteError } = await db()
    .from("screen_requests")
    .update({ note: "" })
    .eq("interview_id", id);
  check(noteError, "요청 메모 삭제");
  const { error } = await db()
    .from("screen_interviews")
    .update({ purged_at: new Date().toISOString(), purge_reason: reason, ai_summary: null })
    .eq("id", id)
    .is("purged_at", null);
  check(error, "삭제 기록");
}

/** 요청 처리. delete 는 그 면접 내용을 지우고, 그 면접의 삭제 요청까지 끝낸다. */
export async function handleRequest(requestId: string, action: "done" | "delete", by: string) {
  const { data: req, error } = await db()
    .from("screen_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  check(error, "요청 조회");
  if (!req) return false;
  if (action === "delete") {
    await purgeInterview(req.interview_id, req.kind === "delete" ? "request" : "staff");
  }
  const patch = { status: "done", handled_at: new Date().toISOString(), handled_by: by.slice(0, 80) };
  const base = db().from("screen_requests").update(patch).eq("status", "open");
  const { error: doneError } =
    action === "delete"
      ? await base.eq("interview_id", req.interview_id).or(`id.eq.${req.id},kind.eq.delete`)
      : await base.eq("id", req.id);
  check(doneError, "요청 처리");
  return true;
}

/**
 * 보관 기간이 지난 면접과, 10일 넘게 처리되지 않은 삭제 요청을 지운다.
 * 대시보드를 열 때와 매일 한 번(/api/cron/purge) 돈다. 여러 번 돌아도 같은 결과.
 */
export async function purgeExpired() {
  const days = await getRetentionDays();
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const { data: old, error } = await db()
    .from("screen_interviews")
    .select("id")
    .is("purged_at", null)
    .or(`completed_at.lt.${cutoff},and(completed_at.is.null,expires_at.lt.${cutoff})`)
    .limit(200);
  check(error, "보관 기간 확인");
  for (const row of old ?? []) await purgeInterview(row.id, "retention");

  const late = new Date(Date.now() - DELETE_REQUEST_DAYS * 86400_000).toISOString();
  const { data: asked, error: askedError } = await db()
    .from("screen_requests")
    .select("id")
    .eq("kind", "delete")
    .eq("status", "open")
    .lt("created_at", late)
    .limit(200);
  check(askedError, "삭제 요청 확인");
  for (const row of asked ?? []) {
    await handleRequest(row.id, "delete", `자동(${DELETE_REQUEST_DAYS}일)`);
  }
  return { retention: (old ?? []).length, requests: (asked ?? []).length, days };
}

/** 담당자용 요청 목록 한 줄. */
export interface RequestRow extends ScreenRequest {
  label: string;
  jobTitle: string;
  hireCandidateId: string | null;
  hirePositionId: string | null;
  submitted: boolean;
  purged: boolean;
}

export async function listRequests(opts: { openOnly?: boolean } = {}): Promise<RequestRow[]> {
  let q = db()
    .from("screen_requests")
    .select(
      "*, screen_interviews(label, stage, purged_at, hire_candidate_id, screen_jobs(title, hire_position_id))"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.openOnly) q = q.eq("status", "open");
  const { data, error } = await q;
  check(error, "요청 목록");
  return (data ?? []).map((row: any) => {
    const iv = Array.isArray(row.screen_interviews) ? row.screen_interviews[0] : row.screen_interviews;
    const job = Array.isArray(iv?.screen_jobs) ? iv.screen_jobs[0] : iv?.screen_jobs;
    return {
      ...toRequest(row),
      label: iv?.label ?? "",
      jobTitle: job?.title ?? "",
      hireCandidateId: iv?.hire_candidate_id ?? null,
      hirePositionId: job?.hire_position_id ?? null,
      submitted: iv?.stage === "제출완료",
      purged: Boolean(iv?.purged_at),
    };
  });
}

/** 처리 안 된 요청 수 — 머리띠 표시용. 표가 아직 없으면 0. */
export async function openRequestCount() {
  try {
    const { count, error } = await db()
      .from("screen_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}
