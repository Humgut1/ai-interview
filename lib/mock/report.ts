import { sampleJob } from "@/lib/mock/jobs";
import type {
  CandidateRow,
  ChatMessage,
  InterviewReport,
} from "@/lib/types";

/**
 * 화면 확인용 가짜 리포트.
 * 4단계에서 Supabase 조회 + Claude 채점 결과로 교체한다.
 * 실존 회사명·실명은 쓰지 않고, 후보자는 익명 라벨로만 표시한다.
 */

const [q1, q2, q3] = sampleJob.questions;

const A1 =
  "작년에 결제 승인 API 의 응답이 느려진다는 문의가 늘어서 확인을 시작했습니다. 대시보드에서 p95 응답시간이 평소 400ms 에서 1.8초까지 올라간 걸 보고, 로그를 시간대별로 나눠 보니 정산 배치가 도는 새벽 2시부터 지표가 나빠지는 게 보였습니다. 배치가 같은 테이블을 오래 잠그고 있어서, 배치를 읽기 전용 복제본으로 옮기고 잠금 범위를 건별로 줄였습니다. 적용 후 p95 는 420ms 로 돌아왔고, 같은 유형의 문의는 두 달 동안 다시 들어오지 않았습니다.";

const A2A =
  "팀에서 새 라이브러리 도입을 두고 의견이 갈렸습니다. 저는 반대했고, 결국 회의에서 다른 방향으로 결정됐습니다.";

const A2B =
  "제가 반대한 이유는 운영 부담이 늘어난다는 점이었는데, 그 자리에서는 근거를 정리해 두지 못했습니다. 회의가 끝나고 팀원이 정리한 도입 근거를 다시 읽어 보고 납득이 돼서, 이후에는 제안대로 진행하는 데 협조했습니다.";

const A3 =
  "정산은 규칙이 자주 바뀌는데도 틀리면 바로 돈 문제가 되는 영역이라, 안정성을 신경 써서 만드는 일이 잘 맞는다고 생각해 지원했습니다. 입사하면 첫 한 달은 기존 정산 흐름과 장애 이력을 읽고 정리해 보고, 두세 달 안에는 반복해서 손이 가는 운영 작업 중 하나를 자동화해 보고 싶습니다.";

const transcript: ChatMessage[] = [
  {
    id: "m-01",
    role: "ai",
    kind: "intro",
    text: `안녕하세요. ${sampleJob.title} 직무 1차 면접을 진행할 AI 면접관입니다. 편하게 답변해 주세요.`,
    at: "2026-08-18T14:02:00+09:00",
  },
  {
    id: "m-02",
    role: "ai",
    kind: "question",
    questionId: q1.id,
    text: q1.text,
    at: "2026-08-18T14:02:00+09:00",
  },
  {
    id: "m-03",
    role: "candidate",
    kind: "answer",
    questionId: q1.id,
    text: A1,
    at: "2026-08-18T14:06:00+09:00",
  },
  {
    id: "m-04",
    role: "ai",
    kind: "question",
    questionId: q2.id,
    text: q2.text,
    at: "2026-08-18T14:06:00+09:00",
  },
  {
    id: "m-05",
    role: "candidate",
    kind: "answer",
    questionId: q2.id,
    text: A2A,
    at: "2026-08-18T14:08:00+09:00",
  },
  {
    id: "m-06",
    role: "ai",
    kind: "followUp",
    questionId: q2.id,
    text: "말씀 감사합니다. 조금 더 구체적으로, 그 상황에서 본인이 직접 한 행동은 무엇이었나요?",
    at: "2026-08-18T14:08:00+09:00",
  },
  {
    id: "m-07",
    role: "candidate",
    kind: "answer",
    questionId: q2.id,
    text: A2B,
    at: "2026-08-18T14:11:00+09:00",
  },
  {
    id: "m-08",
    role: "ai",
    kind: "question",
    questionId: q3.id,
    text: q3.text,
    at: "2026-08-18T14:11:00+09:00",
  },
  {
    id: "m-09",
    role: "candidate",
    kind: "answer",
    questionId: q3.id,
    text: A3,
    at: "2026-08-18T14:14:00+09:00",
  },
  {
    id: "m-10",
    role: "ai",
    kind: "closing",
    text: "답변해 주셔서 감사합니다. 여기까지가 마지막 질문이었습니다.",
    at: "2026-08-18T14:14:00+09:00",
  },
];

const sampleReport: InterviewReport = {
  id: "demo-report",
  jobId: sampleJob.id,
  jobTitle: sampleJob.title,
  candidateLabel: "후보자 A",
  completedAt: "2026-08-18T14:14:00+09:00",
  durationMinutes: 12,
  summary:
    "장애 원인을 지표로 좁혀 간 과정이 뚜렷합니다. 다만 의견이 갈렸을 때 어떻게 조율했는지는 답변에서 확인되지 않았습니다.",
  questions: sampleJob.questions,
  transcript,
  scores: [
    {
      questionId: q1.id,
      score: 88,
      rationale:
        "문제를 인지한 경로(지표), 원인을 좁힌 과정, 조치, 결과가 모두 나왔습니다. 특히 지표 수치와 개선 후 수치를 함께 제시해 '우수' 기준의 마지막 항목까지 충족합니다.",
      evidence: [
        {
          messageId: "m-03",
          quote:
            "p95 응답시간이 평소 400ms 에서 1.8초까지 올라간 걸 보고, 로그를 시간대별로 나눠 보니",
        },
        { messageId: "m-03", quote: "적용 후 p95 는 420ms 로 돌아왔고" },
      ],
      followUps: [
        "읽기 전용 복제본으로 옮길 때 정합성 문제는 어떻게 확인하셨나요?",
        "같은 문제가 다시 생기지 않도록 남긴 알람이나 문서가 있나요?",
      ],
    },
    {
      questionId: q2.id,
      score: 58,
      rationale:
        "상황과 결론은 나왔지만, 의견을 조율하기 위해 한 행동이 답변에 없습니다. 후속 질문을 한 번 더 했는데도 회의 자리에서 한 일은 나오지 않았고, 회의가 끝난 뒤의 태도만 설명했습니다. '보통' 기준의 '본인이 한 행동이 흐릿하다'에 해당합니다.",
      evidence: [
        {
          messageId: "m-05",
          quote: "저는 반대했고, 결국 회의에서 다른 방향으로 결정됐습니다",
        },
        {
          messageId: "m-07",
          quote: "그 자리에서는 근거를 정리해 두지 못했습니다",
        },
      ],
      followUps: [
        "그때 반대 근거를 정리했다면 어떤 내용이 들어갔을까요?",
        "결정된 뒤 실제로 운영 부담이 늘었는지 확인해 보셨나요?",
        "의견이 갈린 다른 사례에서 직접 설득해 본 경험이 있다면 들려주세요.",
      ],
    },
    {
      questionId: q3.id,
      score: 74,
      rationale:
        "직무 특성과 본인 성향을 연결했고, 첫 3개월 목표도 구체적으로 말했습니다. 다만 왜 그 목표가 필요한지에 대한 근거는 본인 경험이 아니라 일반적인 설명에 머물러 '우수'까지는 보지 않았습니다.",
      evidence: [
        {
          messageId: "m-09",
          quote:
            "첫 한 달은 기존 정산 흐름과 장애 이력을 읽고 정리해 보고, 두세 달 안에는 반복해서 손이 가는 운영 작업 중 하나를 자동화해 보고 싶습니다",
        },
      ],
      followUps: [
        "이전에 운영 작업을 자동화해 본 경험이 있다면 어떤 일이었나요?",
      ],
    },
  ],
};

const otherCandidates: CandidateRow[] = [
  {
    reportId: sampleReport.id,
    candidateLabel: sampleReport.candidateLabel,
    completedAt: sampleReport.completedAt,
    aiScore: 75,
    status: "검토중",
  },
  {
    reportId: "demo-report-b",
    candidateLabel: "후보자 B",
    completedAt: "2026-08-17T11:20:00+09:00",
    aiScore: 81,
    finalScore: 78,
    status: "검토완료",
  },
  {
    reportId: "demo-report-c",
    candidateLabel: "후보자 C",
    completedAt: "2026-08-19T09:41:00+09:00",
    aiScore: 62,
    status: "미검토",
  },
];

/** 리포트 조회. 지금은 어떤 id 로 열어도 같은 예시 리포트를 돌려준다. */
export function getReportById(id: string): InterviewReport {
  return { ...sampleReport, id };
}

/** 같은 직무에 지원한 후보자 목록 */
export function getCandidateRows(): CandidateRow[] {
  return otherCandidates;
}
