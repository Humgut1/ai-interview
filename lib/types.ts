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
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    key: "average",
    label: "보통",
    hint: "기대 수준은 채우지만 특별하지는 않은 답변",
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    key: "poor",
    label: "미흡",
    hint: "기준에 못 미치는 답변",
    accent: "text-rose-700 bg-rose-50 border-rose-200",
  },
];

export const MAX_FOLLOW_UPS = 3;
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 10;
