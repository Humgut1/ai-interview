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

/**
 * 새 인터뷰 링크에 쓸 값을 만든다.
 * 이 값 하나로 면접에 들어갈 수 있으므로, 짧은 순번이 아니라 추측하기 어려운 값이어야 한다.
 * API 연결 단계에서 서버가 만들고 만료 기한을 붙인다.
 */
export function createToken() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

/** 후보자 라벨은 지원 순서대로 A, B, C… 로 붙인다. 실명은 다루지 않는다. */
export function nextLabel(candidates: Candidate[]) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const index = candidates.length;
  const letter = alphabet[index % alphabet.length];
  const round = Math.floor(index / alphabet.length);
  return `후보자 ${letter}${round > 0 ? round + 1 : ""}`;
}

export function interviewUrl(token: string, origin: string) {
  return `${origin}/interview/${token}`;
}
