"use client";

import { useEffect, useRef, useState } from "react";
import AnswerInput from "@/components/interview/AnswerInput";
import CompleteScreen from "@/components/interview/CompleteScreen";
import ConsentScreen from "@/components/interview/ConsentScreen";
import MessageBubble from "@/components/interview/MessageBubble";
import ProgressBar from "@/components/interview/ProgressBar";
import { answerAction, startInterviewAction, type CandidateReply } from "@/app/actions";
import { createMessage, progressOf } from "@/lib/interview";
import type { ChatMessage, InterviewSession, InterviewSetup } from "@/lib/types";

const FAIL_TEXT: Record<Exclude<CandidateReply, { ok: true }>["reason"], string> = {
  missing: "면접 링크를 찾을 수 없습니다. 받은 링크를 다시 확인해 주세요.",
  expired: "면접 링크의 기한이 지났습니다. 채용 담당자에게 문의해 주세요.",
  closed: "이미 제출을 마친 면접입니다.",
  stale: "다른 창에서 진행한 내용이 있어 최신 상태로 다시 불러옵니다.",
  error: "전송하지 못했습니다. 연결을 확인하고 다시 보내 주세요. 답변은 입력칸에 남겨 두었습니다.",
};

export default function ChatWindow({
  setup,
  initialSession,
}: {
  setup: InterviewSetup;
  initialSession: InterviewSession;
}) {
  // 진행 기록의 원본은 서버다. 창을 닫았다 다시 열거나 다른 기기에서 열어도 같은 곳에서 이어진다.
  const [session, setSession] = useState(initialSession);
  const [pendingAnswer, setPendingAnswer] = useState<ChatMessage | null>(null);
  const [starting, setStarting] = useState(false);
  const [startedHere, setStartedHere] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const thinking = pendingAnswer !== null;
  const progress = progressOf(session, setup);
  const resumed =
    session.phase === "chat" && !startedHere && session.messages.length > 2;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.messages.length, thinking]);

  function fail(reply: Exclude<CandidateReply, { ok: true }>) {
    setFailure(FAIL_TEXT[reply.reason]);
    if (reply.reason === "stale" || reply.reason === "closed") {
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    setFailure(null);
    try {
      const reply = await startInterviewAction(setup.token);
      if (reply.ok) {
        setStartedHere(true);
        setSession(reply.session);
      } else fail(reply);
    } catch {
      setFailure(FAIL_TEXT.error);
    } finally {
      setStarting(false);
    }
  }

  async function handleAnswer(text: string) {
    setFailure(null);
    setDraft(null);
    setPendingAnswer(
      createMessage({ role: "candidate", kind: "answer", text })
    );
    try {
      // 답변과 다음 질문은 서버가 한 번에 기록한다. 중간 상태로 남아 멈추는 일이 없도록.
      const reply = await answerAction(setup.token, text, session.messages.length);
      if (reply.ok) setSession(reply.session);
      else {
        if (reply.reason === "error") setDraft(text);
        fail(reply);
      }
    } catch {
      setDraft(text);
      setFailure(FAIL_TEXT.error);
    } finally {
      setPendingAnswer(null);
    }
  }

  if (session.phase === "consent") {
    return (
      <>
        <ConsentScreen setup={setup} onStart={handleStart} />
        {failure ? (
          <p role="alert" className="mx-auto mb-10 w-full max-w-2xl px-5 text-sm text-rose-600">
            {failure}
          </p>
        ) : null}
      </>
    );
  }

  if (session.phase === "done") {
    return <CompleteScreen setup={setup} session={session} />;
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-line bg-surface px-4 py-3">
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

      <div className="flex-1 overflow-y-auto bg-canvas px-4 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
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
            <div
              role="status"
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-3.5"
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
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {failure ? (
        <p role="alert" className="shrink-0 border-t border-line bg-surface px-4 py-2 text-center text-sm text-rose-600">
          {failure}
        </p>
      ) : null}
      <AnswerInput
        disabled={thinking}
        onSubmit={handleAnswer}
        restore={draft}
      />
    </div>
  );
}
