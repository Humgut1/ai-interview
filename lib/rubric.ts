import {
  CRITERIA_META,
  MAX_WEIGHT,
  MIN_WEIGHT,
  type Job,
  type Question,
} from "@/lib/types";

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Math.random().toString(36).slice(2, 10)}`;
}

export function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: newId(),
    text: "",
    criteria: { excellent: "", average: "", poor: "" },
    weight: 3,
    maxFollowUps: 1,
    ...overrides,
  };
}

export function createEmptyJob(): Job {
  return {
    id: newId(),
    title: "",
    description: "",
    questions: [createQuestion()],
  };
}

/** from 위치의 질문을 to 위치로 옮긴 새 배열을 돌려준다. */
export function moveQuestion(questions: Question[], from: number, to: number) {
  if (from === to || from < 0 || to < 0) return questions;
  if (from >= questions.length || to >= questions.length) return questions;
  const next = [...questions];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function totalWeight(questions: Question[]) {
  return questions.reduce((sum, q) => sum + q.weight, 0);
}

/**
 * 가중치를 전체 합 대비 % 로 환산. 담당자가 100 을 직접 맞출 필요가 없다.
 * 단순 반올림은 합이 99% 나 101% 가 되므로, 남는 몫을 소수부가 큰 질문부터
 * 1%씩 나눠 주어 표시 합계를 항상 100% 로 맞춘다.
 */
export function weightPercents(questions: Question[]): Record<string, number> {
  const total = totalWeight(questions);
  if (total <= 0) {
    return Object.fromEntries(questions.map((q) => [q.id, 0]));
  }

  const shares = questions.map((q) => {
    const exact = (q.weight / total) * 100;
    const base = Math.floor(exact);
    return { id: q.id, base, remainder: exact - base };
  });

  let left = 100 - shares.reduce((sum, share) => sum + share.base, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    share.base += 1;
    left -= 1;
  }

  return Object.fromEntries(shares.map((share) => [share.id, share.base]));
}

export function clampWeight(value: number) {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(value) || MIN_WEIGHT));
}

/** 안내 1분 + 질문당 답변 2분 + 후속질문당 1분 */
export function estimateMinutes(questions: Question[]) {
  if (questions.length === 0) return 0;
  return questions.reduce((sum, q) => sum + 2 + q.maxFollowUps, 1);
}

export type QuestionErrors = {
  text?: string;
  criteria?: string;
};

export type JobValidation = {
  title?: string;
  questions?: string;
  byQuestion: Record<string, QuestionErrors>;
  errorCount: number;
  isValid: boolean;
};

export function validateJob(job: Job): JobValidation {
  const byQuestion: Record<string, QuestionErrors> = {};
  let errorCount = 0;

  const title = job.title.trim() ? undefined : "직무명을 입력해 주세요.";
  if (title) errorCount += 1;

  const questions =
    job.questions.length > 0 ? undefined : "질문을 1개 이상 추가해 주세요.";
  if (questions) errorCount += 1;

  for (const q of job.questions) {
    const errors: QuestionErrors = {};
    if (!q.text.trim()) errors.text = "질문 내용을 입력해 주세요.";

    const missing = CRITERIA_META.filter(
      (meta) => !q.criteria[meta.key].trim()
    ).map((meta) => meta.label);
    if (missing.length > 0) {
      errors.criteria = `${missing.join(" · ")} 기준이 비어 있습니다. AI 는 여기 적힌 기준으로만 채점합니다.`;
    }

    if (errors.text || errors.criteria) {
      byQuestion[q.id] = errors;
      errorCount += Object.keys(errors).length;
    }
  }

  return {
    title,
    questions,
    byQuestion,
    errorCount,
    isValid: errorCount === 0,
  };
}
