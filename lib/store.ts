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

/**
 * Screen 의 저장·조회는 전부 여기서 한다(서버 전용).
 * 화면(페이지)과 서버 함수는 이 파일만 부르고, 표 이름·칸 이름은 밖으로 새지 않는다.
 */

/** 면접 링크 유효 기간 */
export const INTERVIEW_TTL_DAYS = 14;
/** 답변 한 번의 최대 글자 수. 이보다 길면 잘라서 저장한다. */
export const MAX_ANSWER_CHARS = 4000;

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
  };
}

export async function createJob(job: Job, createdBy?: string) {
  const id = `job_${hex(5)}`;
  const { error } = await db().from("screen_jobs").insert({
    id,
    title: job.title.trim(),
    description: job.description.trim(),
    questions: job.questions,
    created_by: createdBy ?? null,
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
    .select("*, screen_reviews(status), screen_scores(question_id, score)")
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
  return {
    id: row.id,
    label: row.label,
    token: row.token,
    invitedAt: toKst(row.created_at),
    stage: row.stage as CandidateStage,
    ...(submitted
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
  };
}

/** 후보자에게 내려보낼 질문. 평가 기준(criteria)과 비중은 여기서 떼어 낸다. */
function setupOf(token: string, job: Job): InterviewSetup {
  return {
    token,
    jobTitle: job.title,
    estimatedMinutes: estimateMinutes(job.questions),
    questions: job.questions.map((q) => ({
      id: q.id,
      text: q.text,
      maxFollowUps: q.maxFollowUps,
    })),
  };
}

export type InterviewLookup =
  | { state: "ok"; setup: InterviewSetup; session: InterviewSession }
  | { state: "missing" }
  | { state: "expired" };

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
    ...(data.started_at ? { startedAt: toKst(data.started_at) } : {}),
    ...(data.completed_at ? { completedAt: toKst(data.completed_at) } : {}),
  };
  return { row: data, job, setup: setupOf(token, job), session };
}

export async function lookupInterview(token: string): Promise<InterviewLookup> {
  const found = await loadByToken(token);
  if (!found) return { state: "missing" };
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
    .update({ stage: "진행중", consent_at: now, started_at: now })
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
  const { row, setup, session } = loaded;
  if (row.stage !== "진행중") return { ok: false, reason: "closed" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (seen !== session.messages.length || !answer) {
    return { ok: false, reason: "stale" };
  }

  const decision = decideNextStep(session, setup, answer);
  const next = applyDecision(appendAnswer(session, setup, answer), decision);
  const saved = await insertMessages(row.id, session.messages, next.messages);
  if (!saved) return { ok: false, reason: "stale" };

  const done = next.phase === "done";
  const { error } = await db()
    .from("screen_interviews")
    .update({
      question_index: next.questionIndex,
      follow_up_count: next.followUpCount,
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
};

export async function getReport(id: string): Promise<ReportBundle | null> {
  const { data: row, error } = await db()
    .from("screen_interviews")
    .select("*, screen_jobs(*), screen_reviews(*), screen_scores(*)")
    .eq("id", id)
    .maybeSingle();
  check(error, "리포트 조회");
  if (!row || row.stage !== "제출완료" || !row.screen_jobs) return null;

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
