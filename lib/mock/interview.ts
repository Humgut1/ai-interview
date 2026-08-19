import { decideNextStep, type AiDecision } from "@/lib/interview";
import { sampleJob } from "@/lib/mock/jobs";
import { estimateMinutes } from "@/lib/rubric";
import type { InterviewSession, InterviewSetup } from "@/lib/types";

/**
 * 링크(토큰)로 인터뷰 정보를 가져오는 임시 구현.
 * 4단계에서 Supabase 조회로 교체한다. 지금은 어떤 토큰이든 예시 직무를 돌려준다.
 * 평가 기준(criteria)은 후보자에게 내려보내지 않는다.
 */
export function getInterviewByToken(token: string): InterviewSetup {
  return {
    token,
    jobTitle: sampleJob.title,
    estimatedMinutes: estimateMinutes(sampleJob.questions),
    questions: sampleJob.questions.map((question) => ({
      id: question.id,
      text: question.text,
      maxFollowUps: question.maxFollowUps,
    })),
  };
}

/** 답변을 읽고 다음 발언을 정하는 부분. 4단계에서 Claude API 호출로 교체한다. */
export async function askAi(
  session: InterviewSession,
  setup: InterviewSetup,
  answer: string
): Promise<AiDecision> {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  return decideNextStep(session, setup, answer);
}
