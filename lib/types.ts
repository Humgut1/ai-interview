/** 평가 3단계. rubric 에 정의된 이 세 가지 기준으로만 채점한다. */
export type CriteriaLevel = "excellent" | "average" | "poor";

/** 단계별 "이런 답변이면 이 등급" 예시 */
export type Criteria = Record<CriteriaLevel, string>;

export type Question = {
  id: string;
  /** 후보자에게 실제로 보여줄 질문 */
  text: string;
  criteria: Criteria;
  /** 정수 가중치. 화면에는 전체 합 대비 % 로 환산해 보여준다. */
  weight: number;
  /** 답변이 부실할 때 AI 가 되물을 수 있는 최대 횟수 */
  maxFollowUps: number;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  /** 배열 순서가 곧 질문 순서다. 별도 order 필드를 두지 않는다. */
  questions: Question[];
};

/**
 * 등급 표시. 초록/노랑/빨강(신호등)을 일부러 쓰지 않는다.
 * 색으로 합불이 정해진 것처럼 보이면 사람이 답변을 읽지 않고 색만 보게 된다.
 * 대신 글자 진하기로만 단계를 나타낸다.
 */
export const CRITERIA_META: {
  key: CriteriaLevel;
  label: string;
  hint: string;
  accent: string;
}[] = [
  {
    key: "excellent",
    label: "우수",
    hint: "이렇게 답하면 최고점을 줄 만한 답변",
    accent: "border-line-strong bg-mute text-ink",
  },
  {
    key: "average",
    label: "보통",
    hint: "기대 수준은 채우지만 특별하지는 않은 답변",
    accent: "border-line bg-mute text-ink-2",
  },
  {
    key: "poor",
    label: "미흡",
    hint: "기준에 못 미치는 답변",
    accent: "border-line bg-canvas text-ink-3",
  },
];

export const MAX_FOLLOW_UPS = 3;
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 10;

/* ── 인터뷰(후보자 화면) ───────────────────────────── */

/**
 * 후보자에게 내려보내는 질문. 평가 기준(criteria)은 절대 포함하지 않는다.
 * 후보자가 채점 기준을 보고 답을 맞추는 일이 없어야 한다.
 */
export type CandidateQuestion = {
  id: string;
  text: string;
  maxFollowUps: number;
};

export type InterviewSetup = {
  token: string;
  jobTitle: string;
  estimatedMinutes: number;
  questions: CandidateQuestion[];
};

export type ChatRole = "ai" | "candidate";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** 어떤 질문에 딸린 발언인지. 채점 근거를 추적하려면 반드시 필요하다. */
  questionId?: string;
  kind: "intro" | "question" | "followUp" | "answer" | "closing";
  at: string;
};

export type InterviewPhase = "consent" | "chat" | "done";

export type InterviewSession = {
  token: string;
  phase: InterviewPhase;
  messages: ChatMessage[];
  /** 지금 진행 중인 질문의 순서 (0부터) */
  questionIndex: number;
  /** 현재 질문에서 이미 던진 후속 질문 수 */
  followUpCount: number;
  startedAt?: string;
  completedAt?: string;
};

/* ── 결과 리포트(관리자 화면) ───────────────────────────── */

/** 점수의 근거가 된 후보자 발언. 원문 그대로 남긴다. */
export type Evidence = {
  /** 트랜스크립트의 어느 발언인지 */
  messageId: string;
  /** 답변 원문에서 그대로 따온 문장 */
  quote: string;
};

export type QuestionScore = {
  questionId: string;
  /** 0~100 */
  score: number;
  /** 왜 이 점수인지. 어떤 발언 때문인지 반드시 적는다. */
  rationale: string;
  /** 근거가 된 발언. 비어 있으면 안 된다. */
  evidence: Evidence[];
  /** 대면 면접에서 더 확인해 볼 질문 */
  followUps: string[];
};

/** 사람이 손댄 부분. AI 점수는 그대로 두고 따로 보관한다. */
export type RecruiterReview = {
  /** questionId → 담당자가 고쳐 넣은 점수 */
  overrides: Record<string, number>;
  /** questionId → 담당자 메모 */
  memos: Record<string, string>;
  overallMemo: string;
};

export type InterviewReport = {
  id: string;
  jobId: string;
  jobTitle: string;
  /** 개인 식별 정보는 최소한만 다룬다. 화면 확인용은 익명 라벨. */
  candidateLabel: string;
  completedAt: string;
  durationMinutes: number;
  /** 한 줄 요약 */
  summary: string;
  /** 채점에 쓰인 rubric. 관리자에게만 보인다. */
  questions: Question[];
  scores: QuestionScore[];
  transcript: ChatMessage[];
};

/** 같은 직무의 다른 후보자 목록 한 줄 */
export type CandidateRow = {
  reportId: string;
  candidateLabel: string;
  completedAt: string;
  aiScore: number;
  /** 담당자가 검토를 마쳤으면 최종 점수 */
  finalScore?: number;
  status: "미검토" | "검토중" | "검토완료";
};
