import {
  CRITERIA_META,
  type CriteriaLevel,
  type ChatMessage,
  type InterviewReport,
  type Question,
  type QuestionScore,
  type RecruiterReview,
} from "@/lib/types";

export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

export function emptyReview(): RecruiterReview {
  return { overrides: {}, memos: {}, overallMemo: "" };
}

/**
 * 점수를 rubric 의 3단계로 옮긴다.
 * 경계값은 지금 코드에 고정돼 있고, API 연결 단계에서 직무별 설정으로 뺀다.
 */
export function levelOf(score: number): CriteriaLevel {
  if (score >= 80) return "excellent";
  if (score >= 55) return "average";
  return "poor";
}

export function levelMeta(level: CriteriaLevel) {
  return CRITERIA_META.find((meta) => meta.key === level) ?? CRITERIA_META[1];
}

export function clampScore(value: number) {
  if (Number.isNaN(value)) return MIN_SCORE;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)));
}

/** 담당자가 고쳐 넣었으면 그 점수, 아니면 AI 점수 */
export function effectiveScore(score: QuestionScore, review: RecruiterReview) {
  const override = review.overrides[score.questionId];
  return typeof override === "number" ? override : score.score;
}

export function isOverridden(score: QuestionScore, review: RecruiterReview) {
  return typeof review.overrides[score.questionId] === "number";
}

/** 질문 비중을 반영한 가중 평균. 비중 합이 0이면 0점. */
function weightedAverage(
  questions: Question[],
  valueOf: (question: Question) => number | undefined
) {
  let weightSum = 0;
  let scoreSum = 0;

  for (const question of questions) {
    const value = valueOf(question);
    if (value === undefined) continue;
    weightSum += question.weight;
    scoreSum += value * question.weight;
  }

  return weightSum === 0 ? 0 : Math.round(scoreSum / weightSum);
}

export type ReportTotals = {
  /** AI 가 매긴 종합 점수 */
  ai: number;
  /** 담당자 수정까지 반영한 종합 점수 */
  final: number;
  /** 담당자가 점수를 고친 문항 수 */
  changedCount: number;
};

export function reportTotals(
  report: InterviewReport,
  review: RecruiterReview
): ReportTotals {
  const scoreOf = (questionId: string) =>
    report.scores.find((score) => score.questionId === questionId);

  return {
    ai: weightedAverage(report.questions, (q) => scoreOf(q.id)?.score),
    final: weightedAverage(report.questions, (q) => {
      const score = scoreOf(q.id);
      return score ? effectiveScore(score, review) : undefined;
    }),
    changedCount: report.scores.filter((score) => isOverridden(score, review))
      .length,
  };
}

/** 해당 질문에서 오간 발언만 뽑는다. 후속 질문과 그 답변도 함께 나온다. */
export function messagesFor(report: InterviewReport, questionId: string) {
  return report.transcript.filter(
    (message) => message.questionId === questionId
  );
}

export function answersFor(report: InterviewReport, questionId: string) {
  return messagesFor(report, questionId).filter(
    (message) => message.role === "candidate"
  );
}

export function findMessage(report: InterviewReport, messageId: string) {
  return report.transcript.find((message) => message.id === messageId);
}

/**
 * 근거로 인용된 문장을 답변 원문 안에서 찾아 앞·뒤로 자른다.
 * 원문에 없으면 null 을 돌려주고, 화면에서는 강조 없이 그대로 보여준다.
 */
export function splitByQuote(text: string, quote: string) {
  const index = text.indexOf(quote);
  if (index < 0) return null;
  return {
    before: text.slice(0, index),
    match: text.slice(index, index + quote.length),
    after: text.slice(index + quote.length),
  };
}

export function answerCountOf(transcript: ChatMessage[]) {
  return transcript.filter((message) => message.role === "candidate").length;
}

/**
 * ISO 문자열에 적힌 시각·날짜를 그대로 읽는다.
 * new Date 로 변환하면 서버와 브라우저의 시간대가 달라 화면이 어긋날 수 있다.
 */
export function clockOf(iso: string) {
  return iso.slice(11, 16);
}

export function dateOf(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
