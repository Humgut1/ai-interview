import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude 호출은 전부 서버에서만 한다.
 * API 키가 브라우저로 내려가면 누구나 우리 키로 요금을 쓸 수 있기 때문에,
 * 이 파일은 서버 컴포넌트와 app/api/* 라우트에서만 import 한다.
 */

/** 이 도구가 쓰는 모델. 가장 성능이 좋은 모델을 기본으로 둔다. */
export const AI_MODEL = "claude-opus-5";

/** .env.local 에 키를 넣었는지. 안 넣었으면 화면은 예시 초안으로 대체된다. */
export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;

/** 키가 없으면 만들지 않는다. 호출 전에 isAiConfigured() 로 먼저 확인할 것. */
export function getAnthropic(): Anthropic {
  if (!isAiConfigured()) {
    throw new Error("ANTHROPIC_API_KEY 가 설정되어 있지 않습니다.");
  }
  client ??= new Anthropic();
  return client;
}
