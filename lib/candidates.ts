import type { Candidate, CandidateStage } from "@/lib/types";

/** 목록 위에 나오는 요약 숫자 */
export type StageCounts = {
  total: number;
  링크발급: number;
  진행중: number;
  제출완료: number;
  /** 제출은 했지만 아직 담당자가 보지 않은 사람 */
  검토대기: number;
};

export function countStages(candidates: Candidate[]): StageCounts {
  const counts: StageCounts = {
    total: candidates.length,
    링크발급: 0,
    진행중: 0,
    제출완료: 0,
    검토대기: 0,
  };

  for (const candidate of candidates) {
    counts[candidate.stage] += 1;
    if (candidate.stage === "제출완료" && candidate.reviewStatus === "미검토") {
      counts.검토대기 += 1;
    }
  }

  return counts;
}

export const STAGE_FILTERS: { key: "전체" | CandidateStage; label: string }[] = [
  { key: "전체", label: "전체" },
  { key: "링크발급", label: "링크 발급" },
  { key: "진행중", label: "진행 중" },
  { key: "제출완료", label: "제출 완료" },
];

export function filterByStage(
  candidates: Candidate[],
  stage: "전체" | CandidateStage
) {
  return stage === "전체"
    ? candidates
    : candidates.filter((candidate) => candidate.stage === stage);
}

export function interviewUrl(token: string, origin: string) {
  return `${origin}/interview/${token}`;
}
