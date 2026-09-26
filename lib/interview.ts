import { newId } from "@/lib/rubric";
import {
  SHORT_VIDEO_SEC,
  type ChatMessage,
  type InterviewSession,
  type InterviewSetup,
} from "@/lib/types";

export function createMessage(
  message: Omit<ChatMessage, "id" | "at">
): ChatMessage {
  return { ...message, id: newId(), at: new Date().toISOString() };
}

/** 아직 시작하지 않은 상태. 동의 화면부터 보여준다. */
export function emptySession(token: string): InterviewSession {
  return {
    token,
    phase: "consent",
    messages: [],
    questionIndex: 0,
    followUpCount: 0,
    takeCount: 0,
  };
}

/** 동의 후 첫 질문까지 담아 인터뷰를 시작한다. */
export function startSession(setup: InterviewSetup): InterviewSession {
  const first = setup.questions[0];
  return {
    token: setup.token,
    phase: "chat",
    questionIndex: 0,
    followUpCount: 0,
    takeCount: 0,
    startedAt: new Date().toISOString(),
    messages: [
      createMessage({
        role: "ai",
        kind: "intro",
        text:
          setup.mode === "video"
            ? `안녕하세요. ${setup.jobTitle} 직무 1차 영상 면접입니다. 질문마다 준비 시간 뒤에 답변을 녹화합니다. 정답을 맞히는 자리가 아니라, 경험을 구체적으로 듣는 자리입니다.`
            : `안녕하세요. ${setup.jobTitle} 직무 1차 면접을 진행할 AI 면접관입니다. 편하게 답변해 주세요. 정답을 맞히는 자리가 아니라, 경험을 구체적으로 듣는 자리입니다.`,
      }),
      createMessage({
        role: "ai",
        kind: "question",
        questionId: first.id,
        text: first.text,
      }),
    ],
  };
}

/** AI 가 답변을 받고 무엇을 할지 정한 결과 */
export type AiDecision =
  | { type: "followUp"; questionId: string; text: string }
  | { type: "nextQuestion"; questionId: string; text: string }
  | { type: "finish"; text: string };

const FOLLOW_UP_PROMPTS = [
  "말씀 감사합니다. 조금 더 구체적으로, 그 상황에서 본인이 직접 한 행동은 무엇이었나요?",
  "이해했습니다. 그 결과가 어떻게 됐는지, 확인할 수 있었던 변화가 있다면 알려 주세요.",
  "마지막으로 하나만 더 여쭤볼게요. 다시 같은 상황이 온다면 어떤 점을 다르게 하시겠어요?",
];

/**
 * 답변이 짧고 사례가 없으면 후속 질문을 던진다. 실제 판단은 API 연결 단계에서 Claude 가 한다.
 * 글: 120자 미만이면 짧음. 영상: 녹화 길이로 판단하고 되묻는 질문은 최대 1개.
 */
export function decideNextStep(
  session: InterviewSession,
  setup: InterviewSetup,
  answer: string | { seconds: number }
): AiDecision {
  const current = setup.questions[session.questionIndex];
  const video = typeof answer !== "string";
  const thin = video
    ? answer.seconds < SHORT_VIDEO_SEC
    : answer.trim().length < 120;
  const limit = video
    ? Math.min(current?.maxFollowUps ?? 0, 1)
    : current?.maxFollowUps ?? 0;
  const canFollowUp = session.followUpCount < limit;

  if (current && thin && canFollowUp) {
    return {
      type: "followUp",
      questionId: current.id,
      text: FOLLOW_UP_PROMPTS[Math.min(session.followUpCount, FOLLOW_UP_PROMPTS.length - 1)],
    };
  }

  const next = setup.questions[session.questionIndex + 1];
  if (next) {
    return {
      type: "nextQuestion",
      questionId: next.id,
      text: next.text,
    };
  }

  return {
    type: "finish",
    text: "답변해 주셔서 감사합니다. 여기까지가 마지막 질문이었습니다.",
  };
}

/** 후보자 답변을 기록한다. 제출한 답변은 수정하지 않는다. 영상이면 text 는 비워 두고 media 를 단다. */
export function appendAnswer(
  session: InterviewSession,
  setup: InterviewSetup,
  text: string,
  media?: ChatMessage["media"]
): InterviewSession {
  const current = setup.questions[session.questionIndex];
  return {
    ...session,
    messages: [
      ...session.messages,
      createMessage({
        role: "candidate",
        kind: "answer",
        questionId: current?.id,
        text: text.trim(),
        ...(media ? { media, stt: "pending" as const } : {}),
      }),
    ],
  };
}

export function applyDecision(
  session: InterviewSession,
  decision: AiDecision
): InterviewSession {
  if (decision.type === "followUp") {
    return {
      ...session,
      followUpCount: session.followUpCount + 1,
      takeCount: 0,
      messages: [
        ...session.messages,
        createMessage({
          role: "ai",
          kind: "followUp",
          questionId: decision.questionId,
          text: decision.text,
        }),
      ],
    };
  }

  if (decision.type === "nextQuestion") {
    return {
      ...session,
      questionIndex: session.questionIndex + 1,
      followUpCount: 0,
      takeCount: 0,
      messages: [
        ...session.messages,
        createMessage({
          role: "ai",
          kind: "question",
          questionId: decision.questionId,
          text: decision.text,
        }),
      ],
    };
  }

  return {
    ...session,
    phase: "done",
    completedAt: new Date().toISOString(),
    messages: [
      ...session.messages,
      createMessage({ role: "ai", kind: "closing", text: decision.text }),
    ],
  };
}

export function progressOf(session: InterviewSession, setup: InterviewSetup) {
  const total = setup.questions.length;
  const answered =
    session.phase === "done" ? total : Math.min(session.questionIndex, total);
  const current = Math.min(session.questionIndex + 1, total);
  return {
    total,
    current: session.phase === "done" ? total : current,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}
