"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import AnswerInput from "@/components/interview/AnswerInput";
import CompleteScreen from "@/components/interview/CompleteScreen";
import ConsentScreen from "@/components/interview/ConsentScreen";
import MessageBubble from "@/components/interview/MessageBubble";
import ProgressBar from "@/components/interview/ProgressBar";
import {
  appendAnswer,
  applyDecision,
  createMessage,
  emptySession,
  progressOf,
  startSession,
} from "@/lib/interview";
import {
  clearSession,
  parseSession,
  readSessionRaw,
  subscribeSession,
  writeSession,
} from "@/lib/interview-store";
import { askAi } from "@/lib/mock/interview";
import type { ChatMessage, InterviewSetup } from "@/lib/types";

export default function ChatWindow({ setup }: { setup: InterviewSetup }) {
  // 진행 상태는 브라우저 저장소가 원본이다. 서버 렌더링 때는 null 이라 동의 화면부터 보인다.
  const raw = useSyncExternalStore(
    subscribeSession,
    () => readSessionRaw(setup.token),
    () => null
  );

  const session = useMemo(
    () => parseSession(raw) ?? emptySession(setup.token),
    [raw, setup.token]
  );

  // 화면에는 바로 보여 주되, 저장은 AI 응답과 함께 한 번에 한다.
  const [pendingAnswer, setPendingAnswer] = useState<ChatMessage | null>(null);
  const [startedHere, setStartedHere] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const thinking = pendingAnswer !== null;
  const progress = progressOf(session, setup);
  const resumed =
    session.phase === "chat" && !startedHere && session.messages.length > 2;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.messages.length, thinking]);

  function handleStart() {
    setStartedHere(true);
    writeSession(startSession(setup));
  }

  async function handleAnswer(text: string) {
    setPendingAnswer(
      createMessage({ role: "candidate", kind: "answer", text })
    );
    try {
      const decision = await askAi(session, setup, text);
      // 답변과 AI 응답을 한 번에 기록한다. 중간 상태로 남아 멈추는 일이 없도록.
      writeSession(applyDecision(appendAnswer(session, setup, text), decision));
    } finally {
      setPendingAnswer(null);
    }
  }

  if (session.phase === "consent") {
    return <ConsentScreen setup={setup} onStart={handleStart} />;
  }

  if (session.phase === "done") {
    return (
      <CompleteScreen
        setup={setup}
        session={session}
        onRestart={() => clearSession(setup.token)}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-line bg-surface px-4 py-3">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5">
          <p className="truncate text-sm font-semibold text-ink">
            {setup.jobTitle} · 1차 면접
          </p>
          <ProgressBar
            current={progress.current}
            total={progress.total}
            percent={progress.percent}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          {resumed ? (
            <p className="self-center rounded-full bg-mute px-3 py-1 text-xs text-ink-2">
              이전에 진행하던 면접을 이어서 진행합니다.
            </p>
          ) : null}

          {session.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {pendingAnswer ? <MessageBubble message={pendingAnswer} /> : null}

          {thinking ? (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
              >
                AI
              </span>
              <div
                role="status"
                className="flex items-center gap-1.5 rounded-md rounded-tl-sm border border-line bg-surface px-4 py-3.5"
              >
                <span className="sr-only">답변을 읽고 있습니다</span>
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    aria-hidden
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <AnswerInput disabled={thinking} onSubmit={handleAnswer} />
    </div>
  );
}
