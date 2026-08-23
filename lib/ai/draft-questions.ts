import { AI_MODEL, getAnthropic } from "@/lib/ai/client";
import { clampWeight, createQuestion } from "@/lib/rubric";
import { MAX_FOLLOW_UPS, type Question } from "@/lib/types";

/**
 * 직무 설명을 읽고 "질문 + 채점 기준 + 비중" 초안을 만든다.
 * 만들어진 것은 어디까지나 초안이고, 실제로 쓰기 전에 사람이 반드시 검토한다.
 */

const SYSTEM_PROMPT = `당신은 채용 담당자를 돕는 면접 설계 도우미입니다.
주어진 직무 설명을 읽고, 1차 화상/채팅 면접에서 쓸 질문과 채점 기준(rubric) 초안을 만듭니다.

지켜야 할 원칙:
1. 질문은 4~6개. 모든 후보자에게 똑같은 순서로 물어볼 수 있는 고정 질문이어야 합니다.
2. 지식을 맞히는 퀴즈가 아니라, 지원자가 실제로 해 본 일을 묻는 행동 기반 질문으로 씁니다.
   ("~을 아시나요" 대신 "~했던 경험을 하나 골라 말씀해 주세요")
3. 직무 설명에 실제로 적혀 있는 업무와 역량에서만 질문을 뽑습니다.
   설명에 없는 기술이나 역량을 지어내지 않습니다.
4. 질문마다 우수/보통/미흡 세 단계 기준을 씁니다. 기준은 채점자가 답변을 듣고
   바로 판정할 수 있도록, 답변에서 관찰 가능한 내용으로 적습니다.
   ("열정적이다" 같은 인상 평가 금지, "본인이 한 행동과 그 결과를 사실로 뒷받침한다" 처럼)
5. 비중(weight)은 1~10 정수입니다. 직무 설명에서 더 중요하다고 밝힌 역량에 큰 수를 줍니다.
6. 후속 질문 허용 횟수(maxFollowUps)는 0~3 사이 정수입니다. 답이 짧아지기 쉬운 질문일수록 크게 둡니다.
7. 직무 수행과 무관한 개인 정보는 절대 묻지 않습니다.
   나이, 성별, 결혼·출산·가족관계, 출신 지역, 출신 학교, 외모, 재산, 종교, 정치 성향,
   병역, 건강 상태나 장애 여부는 질문에도 채점 기준에도 넣지 않습니다.
8. 모든 문장은 한국어 존댓말로 씁니다. 회사 이름이나 특정 제품명은 쓰지 않습니다.`;

/** 모델이 이 모양으로만 답하도록 강제한다. 형식이 틀리면 화면이 깨지기 때문이다. */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "후보자에게 그대로 보여줄 질문" },
          weight: { type: "integer", minimum: 1, maximum: 10 },
          maxFollowUps: { type: "integer", minimum: 0, maximum: 3 },
          criteria: {
            type: "object",
            properties: {
              excellent: { type: "string", description: "최고점을 줄 만한 답변" },
              average: { type: "string", description: "기대 수준은 채운 답변" },
              poor: { type: "string", description: "기준에 못 미치는 답변" },
            },
            required: ["excellent", "average", "poor"],
            additionalProperties: false,
          },
        },
        required: ["text", "weight", "maxFollowUps", "criteria"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

type DraftItem = {
  text: string;
  weight: number;
  maxFollowUps: number;
  criteria: { excellent: string; average: string; poor: string };
};

/** 모델 답을 그대로 믿지 않고, 화면이 기대하는 값인지 한 번 더 확인한다. */
function toQuestions(raw: unknown): Question[] {
  const items = (raw as { questions?: unknown })?.questions;
  if (!Array.isArray(items)) return [];

  return (items as DraftItem[])
    .filter(
      (item) =>
        typeof item?.text === "string" &&
        item.text.trim().length > 0 &&
        typeof item?.criteria?.excellent === "string" &&
        typeof item?.criteria?.average === "string" &&
        typeof item?.criteria?.poor === "string" &&
        item.criteria.excellent.trim().length > 0 &&
        item.criteria.average.trim().length > 0 &&
        item.criteria.poor.trim().length > 0
    )
    .slice(0, 6)
    .map((item) =>
      createQuestion({
        text: item.text.trim(),
        weight: clampWeight(Number(item.weight)),
        maxFollowUps: Math.min(
          MAX_FOLLOW_UPS,
          Math.max(0, Math.round(Number(item.maxFollowUps)) || 0)
        ),
        criteria: {
          excellent: item.criteria.excellent.trim(),
          average: item.criteria.average.trim(),
          poor: item.criteria.poor.trim(),
        },
      })
    );
}

export class DraftFormatError extends Error {}

export async function draftQuestions(input: {
  title: string;
  description: string;
}): Promise<Question[]> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    // effort 는 "얼마나 오래 생각할지"다. 담당자가 버튼을 누르고 기다리는 화면이라
    // 품질과 대기 시간의 절충으로 medium 을 쓴다.
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `직무명: ${input.title.trim() || "(입력되지 않음)"}

직무 설명:
${input.description.trim()}`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DraftFormatError("모델이 돌려준 형식을 읽지 못했습니다.");
  }

  const questions = toQuestions(parsed);
  if (questions.length === 0) {
    throw new DraftFormatError("쓸 수 있는 질문이 만들어지지 않았습니다.");
  }
  return questions;
}
