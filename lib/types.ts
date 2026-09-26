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
  mode: InterviewMode;
  video: VideoRules;
};

/** 면접 방식. 영상 = 질문마다 캠으로 답을 녹화(V1 기본), 글 = 채팅으로 답을 씀. */
export type InterviewMode = "video" | "text";

/** 영상 면접 규칙 (공고마다). */
export type VideoRules = {
  /** 답변 녹화 최대 시간(초) */
  answerSec: number;
  /** 질문을 보고 녹화가 시작되기까지 준비 시간(초) */
  prepSec: number;
  /** 다시 찍기 허용 횟수 (0~1) */
  retakes: number;
};

export const VIDEO_DEFAULTS: VideoRules = { answerSec: 120, prepSec: 30, retakes: 1 };
export const ANSWER_SEC_CHOICES = [60, 90, 120, 180];
export const PREP_SEC_CHOICES = [15, 30, 60];
export const RETAKE_CHOICES = [0, 1];
/** 이보다 짧은 영상 답변이면 되묻는 질문 하나 (AI 는 SC3) */
export const SHORT_VIDEO_SEC = 20;

/** 공고에서 읽은 영상 규칙을 허용 범위로 맞춘다. */
export function cleanVideoRules(value: Partial<VideoRules> | null | undefined): VideoRules {
  const pick = (n: unknown, choices: number[], fallback: number) =>
    choices.includes(Number(n)) ? Number(n) : fallback;
  return {
    answerSec: pick(value?.answerSec, ANSWER_SEC_CHOICES, VIDEO_DEFAULTS.answerSec),
    prepSec: pick(value?.prepSec, PREP_SEC_CHOICES, VIDEO_DEFAULTS.prepSec),
    retakes: pick(value?.retakes, RETAKE_CHOICES, VIDEO_DEFAULTS.retakes),
  };
}

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
  mode: InterviewMode;
  video: VideoRules;
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
  /** 영상 답변이면 녹화 파일 정보. text 는 받아 적기(SC7) 전까지 비어 있다. */
  media?: {
    path: string;
    seconds: number;
    /** 이 질문에서 몇 번째 녹화였는지 (1부터) */
    take: number;
  };
  /** 받아 적기 상태 — 영상 답변에만 */
  stt?: "pending" | "done" | "failed";
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
  /** 영상 면접: 지금 질문(또는 되묻는 질문)에서 녹화를 시작한 횟수 */
  takeCount: number;
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
  /** 아직 채점 전이면 없음 */
  aiScore?: number;
  /** 담당자가 검토를 마쳤으면 최종 점수 */
  finalScore?: number;
  status: "미검토" | "검토중" | "검토완료";
};

/* ── 후보자 관리 · 대시보드 ───────────────────────────── */

/**
 * 후보자가 지금 전형의 어디쯤 있는지.
 * 검토 상태(미검토/검토중/검토완료)와는 다른 축이다. 제출을 해야 검토가 시작된다.
 */
export type CandidateStage = "링크발급" | "진행중" | "제출완료";

export type ReviewStatus = CandidateRow["status"];

/** 후보자 관리 화면의 한 줄. 개인정보는 익명 라벨과 링크 토큰만 다룬다. */
export type Candidate = {
  id: string;
  label: string;
  /** 인터뷰 링크에 들어가는 값. 이 값만 있으면 누구나 면접에 들어갈 수 있다. */
  token: string;
  invitedAt: string;
  stage: CandidateStage;
  /** 아래 항목은 제출을 마친 후보자에게만 있다. */
  reportId?: string;
  completedAt?: string;
  aiScore?: number;
  finalScore?: number;
  reviewStatus?: ReviewStatus;
  /** 후보자가 AI 대신 담당자 면접을 요청했다 */
  optedOut?: boolean;
  /** 보관 기간·삭제 요청으로 내용을 지웠다 */
  purged?: boolean;
  /** 처리 안 된 후보자 요청 수 */
  openRequests?: number;
};

/** 대시보드 목록에 쓰는 공고 한 줄. 질문 본문까지는 담지 않는다. */
export type JobSummary = {
  id: string;
  title: string;
  status: "진행중" | "마감";
  createdAt: string;
  questionCount: number;
  /** 마지막으로 누군가 답변을 제출하거나 링크를 받은 시각 */
  lastActivityAt: string;
};
