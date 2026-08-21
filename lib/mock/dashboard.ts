import { sampleJob } from "@/lib/mock/jobs";
import type { Candidate, JobSummary } from "@/lib/types";

/**
 * 대시보드·후보자 관리 화면 확인용 가짜 데이터.
 * API 연결 단계에서 Supabase 조회로 교체한다.
 * 실존 회사명·실명은 쓰지 않고, 후보자는 익명 라벨로만 표시한다.
 */

const jobs: JobSummary[] = [
  {
    id: sampleJob.id,
    title: sampleJob.title,
    status: "진행중",
    createdAt: "2026-08-11T10:00:00+09:00",
    questionCount: sampleJob.questions.length,
    lastActivityAt: "2026-08-19T09:41:00+09:00",
  },
  {
    id: "job-data",
    title: "데이터 분석가 (신입/경력)",
    status: "진행중",
    createdAt: "2026-08-14T14:30:00+09:00",
    questionCount: 4,
    lastActivityAt: "2026-08-18T17:05:00+09:00",
  },
  {
    id: "job-cs",
    title: "고객 지원 담당자",
    status: "마감",
    createdAt: "2026-07-28T09:15:00+09:00",
    questionCount: 3,
    lastActivityAt: "2026-08-08T13:22:00+09:00",
  },
];

const candidatesByJob: Record<string, Candidate[]> = {
  [sampleJob.id]: [
    {
      id: "c-01",
      label: "후보자 A",
      token: "demo",
      invitedAt: "2026-08-16T09:00:00+09:00",
      stage: "제출완료",
      reportId: "demo-report",
      completedAt: "2026-08-18T14:32:00+09:00",
      aiScore: 75,
      reviewStatus: "검토중",
    },
    {
      id: "c-02",
      label: "후보자 B",
      token: "demo-b",
      invitedAt: "2026-08-16T09:00:00+09:00",
      stage: "제출완료",
      reportId: "demo-report-b",
      completedAt: "2026-08-17T11:20:00+09:00",
      aiScore: 81,
      finalScore: 78,
      reviewStatus: "검토완료",
    },
    {
      id: "c-03",
      label: "후보자 C",
      token: "demo-c",
      invitedAt: "2026-08-17T15:40:00+09:00",
      stage: "제출완료",
      reportId: "demo-report-c",
      completedAt: "2026-08-19T09:41:00+09:00",
      aiScore: 62,
      reviewStatus: "미검토",
    },
    {
      id: "c-04",
      label: "후보자 D",
      token: "demo-d",
      invitedAt: "2026-08-19T10:10:00+09:00",
      stage: "진행중",
    },
    {
      id: "c-05",
      label: "후보자 E",
      token: "demo-e",
      invitedAt: "2026-08-20T08:55:00+09:00",
      stage: "링크발급",
    },
  ],
  "job-data": [
    {
      id: "d-01",
      label: "후보자 A",
      token: "demo-data-a",
      invitedAt: "2026-08-15T13:00:00+09:00",
      stage: "제출완료",
      reportId: "demo-report",
      completedAt: "2026-08-16T10:12:00+09:00",
      aiScore: 69,
      reviewStatus: "미검토",
    },
    {
      id: "d-02",
      label: "후보자 B",
      token: "demo-data-b",
      invitedAt: "2026-08-18T16:00:00+09:00",
      stage: "진행중",
    },
  ],
  "job-cs": [
    {
      id: "s-01",
      label: "후보자 A",
      token: "demo-cs-a",
      invitedAt: "2026-08-01T09:00:00+09:00",
      stage: "제출완료",
      reportId: "demo-report",
      completedAt: "2026-08-02T15:30:00+09:00",
      aiScore: 84,
      finalScore: 84,
      reviewStatus: "검토완료",
    },
  ],
};

export function getJobSummaries(): JobSummary[] {
  return jobs;
}

export function getJobSummary(jobId: string): JobSummary {
  return jobs.find((job) => job.id === jobId) ?? jobs[0];
}

/** 지원한 순서 그대로 돌려준다. 점수순 정렬은 하지 않는다. */
export function getCandidates(jobId: string): Candidate[] {
  return candidatesByJob[jobId] ?? [];
}
