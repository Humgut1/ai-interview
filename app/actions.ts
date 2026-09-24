"use server";

import {
  answerInterview,
  createJob,
  issueInterview,
  saveReview,
  startInterview,
} from "@/lib/store";
import { validateJob } from "@/lib/rubric";
import type {
  Candidate,
  InterviewSession,
  Job,
  RecruiterReview,
  ReviewStatus,
} from "@/lib/types";

/*
 * 화면에서 부르는 서버 함수 모음.
 * 담당자 함수(공고 저장·링크 발급·검토 저장)는 SC4 에서 TalentCore 로그인 확인을 첫 줄에 붙인다.
 * 그 전까지 Screen 은 배포하지 않는다.
 * 후보자 함수(시작·답변)는 링크 값(token)으로만 지킨다.
 */

/* ── 담당자 ───────────────────────────── */

export async function saveJobAction(
  job: Job
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  if (!validateJob(job).isValid) {
    return { ok: false, reason: "아직 채우지 않은 항목이 있습니다." };
  }
  try {
    return { ok: true, id: await createJob(job) };
  } catch {
    return { ok: false, reason: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}

export async function issueLinkAction(
  jobId: string
): Promise<{ ok: true; candidate: Candidate } | { ok: false }> {
  try {
    return { ok: true, candidate: await issueInterview(jobId) };
  } catch {
    return { ok: false };
  }
}

const REVIEW_STATUSES: ReviewStatus[] = ["미검토", "검토중", "검토완료"];

export async function saveReviewAction(
  id: string,
  review: RecruiterReview,
  status: ReviewStatus
): Promise<{ ok: boolean }> {
  if (!REVIEW_STATUSES.includes(status)) return { ok: false };
  try {
    return { ok: await saveReview(id, review, status) };
  } catch {
    return { ok: false };
  }
}

/* ── 후보자 ───────────────────────────── */

export type CandidateReply =
  | { ok: true; session: InterviewSession }
  | { ok: false; reason: "missing" | "expired" | "stale" | "closed" | "error" };

export async function startInterviewAction(token: string): Promise<CandidateReply> {
  try {
    const result = await startInterview(token);
    return result.state === "ok"
      ? { ok: true, session: result.session }
      : { ok: false, reason: result.state };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function answerAction(
  token: string,
  text: string,
  seen: number
): Promise<CandidateReply> {
  if (typeof text !== "string" || typeof seen !== "number") {
    return { ok: false, reason: "error" };
  }
  try {
    return await answerInterview(token, text, seen);
  } catch {
    return { ok: false, reason: "error" };
  }
}
