import type { Candidate } from "@/lib/types";

/**
 * 후보자 한 명이 지금 어디에 있는지. 목록 탭·상태 점·숫자가 전부 이 한 곳을 본다.
 * 검토 대기 = 다 냈는데 담당자가 '검토 끝'을 누르지 않은 사람.
 */
export type Bucket = "검토대기" | "진행중" | "안열어봄" | "검토끝" | "면접요청" | "만료" | "그만둠" | "삭제됨";

export function bucketOf(c: Candidate): Bucket {
  if (c.withdrawn) return "그만둠";
  if (c.purged) return "삭제됨";
  if (c.optedOut) return "면접요청";
  if (c.stage === "제출완료") return c.reviewStatus === "검토완료" ? "검토끝" : "검토대기";
  if (c.expired) return "만료";
  return c.stage === "진행중" ? "진행중" : "안열어봄";
}

/** 상태 점 색(글자색 · 점색) — 색은 상태에만 쓴다 */
export const BUCKET_LOOK: Record<Bucket, { label: string; ink: string; dot: string }> = {
  검토대기: { label: "검토 대기", ink: "text-st-warn-ink", dot: "bg-st-warn" },
  진행중: { label: "진행 중", ink: "text-st-run-ink", dot: "bg-st-run" },
  안열어봄: { label: "안 열어 봄", ink: "text-ink-3", dot: "bg-st-off" },
  검토끝: { label: "검토 끝", ink: "text-st-ok-ink", dot: "bg-st-ok" },
  면접요청: { label: "담당자 면접 요청", ink: "text-st-warn-ink", dot: "bg-st-warn" },
  만료: { label: "링크 만료", ink: "text-ink-3", dot: "bg-st-off" },
  그만둠: { label: "지원 그만둠", ink: "text-ink-3", dot: "bg-st-off" },
  삭제됨: { label: "기록 삭제됨", ink: "text-ink-3", dot: "bg-st-off" },
};

export type StageCounts = Record<Bucket, number> & {
  total: number;
  /** 링크를 보낸 사람 */
  sent: number;
  /** 답을 다 낸 사람 */
  submitted: number;
};

export function countStages(candidates: Candidate[]): StageCounts {
  const counts: StageCounts = {
    total: candidates.length,
    sent: candidates.length,
    submitted: 0,
    검토대기: 0,
    진행중: 0,
    안열어봄: 0,
    검토끝: 0,
    면접요청: 0,
    만료: 0,
    그만둠: 0,
    삭제됨: 0,
  };
  for (const c of candidates) {
    counts[bucketOf(c)] += 1;
    if (c.stage === "제출완료") counts.submitted += 1;
  }
  return counts;
}

export type CandFilter = "전체" | "검토대기" | "진행중" | "안열어봄" | "검토끝" | "면접요청";

export const CAND_FILTERS: { key: CandFilter; label: string }[] = [
  { key: "전체", label: "전체" },
  { key: "검토대기", label: "검토 대기" },
  { key: "진행중", label: "진행 중" },
  { key: "안열어봄", label: "안 열어 봄" },
  { key: "검토끝", label: "검토 끝" },
  { key: "면접요청", label: "담당자 면접 요청" },
];

export function filterCands(candidates: Candidate[], f: CandFilter) {
  return f === "전체" ? candidates : candidates.filter((c) => bucketOf(c) === f);
}

export function interviewUrl(token: string, origin: string) {
  return `${origin}/interview/${token}`;
}

/** "2026-09-27T21:14:00+09:00" → "9/27" */
export function md(iso?: string) {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** "2026-09-27T21:14:00+09:00" → "9/27 21:14" */
export function mdhm(iso?: string) {
  if (!iso) return "";
  return `${md(iso)} ${iso.slice(11, 16)}`;
}

/** Hire 주소 — 운영 기본값, 로컬은 env 로 바꾼다 */
export function hireBase() {
  return (process.env.HIRE_URL || "https://talentcore-hire.vercel.app").replace(/\/$/, "");
}
