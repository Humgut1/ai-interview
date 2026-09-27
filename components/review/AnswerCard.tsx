"use client";

import { textareaClass } from "@/components/ui/Field";
import { cardClass, labelClass } from "@/components/ui/styles";
import VideoAnswer from "@/components/review/VideoAnswer";
import type { ChatMessage, Question, RecruiterReview } from "@/lib/types";

/**
 * 채점 전 문항 한 줄 — 질문 · 영상(또는 글) 답변 · 받아 적은 글 · 담당자 메모.
 * 채점(SC2)이 붙으면 이 자리에 ScoreCard 가 대신 들어간다.
 */
export default function AnswerCard({
  index,
  question,
  percent,
  messages,
  review,
  onMemo,
  sttReady,
}: {
  index: number;
  question: Question;
  percent: number;
  messages: ChatMessage[];
  review: RecruiterReview;
  onMemo: (questionId: string, memo: string) => void;
  sttReady: boolean;
}) {
  const answers = messages.filter((m) => m.role === "candidate");

  return (
    <article className={cardClass}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className={labelClass}>
            문항 {index + 1} &nbsp;·&nbsp; 비중 {percent}%
          </p>
          <h3 className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
            {question.text}
          </h3>
        </div>
        <span className="shrink-0 text-xs text-ink-3">채점 대기</span>
      </header>

      <section className="flex flex-col gap-4 px-5 py-4">
        {answers.length === 0 ? (
          <p className="text-sm text-ink-3">이 문항에 남은 답변이 없습니다.</p>
        ) : (
          messages.map((message) =>
            message.role === "ai" ? (
              message.kind === "followUp" ? (
                <p key={message.id} className="text-sm leading-relaxed text-ink-3">
                  <span className="mr-1.5 rounded-sm bg-mute px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">
                    후속 질문
                  </span>
                  {message.text}
                </p>
              ) : null
            ) : message.media ? (
              <VideoAnswer key={message.id} message={message} sttReady={sttReady} />
            ) : (
              <p
                key={message.id}
                className="whitespace-pre-wrap border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-ink"
              >
                {message.text}
              </p>
            )
          )
        )}
      </section>

      <section className="border-t border-line bg-canvas px-5 py-4">
        <label htmlFor={`memo-${question.id}`} className={`${labelClass} block`}>
          담당자 메모
        </label>
        <textarea
          id={`memo-${question.id}`}
          rows={2}
          value={review.memos[question.id] ?? ""}
          onChange={(event) => onMemo(question.id, event.target.value)}
          placeholder="이 답변에서 확인한 점, 대면 면접에서 더 물어볼 점"
          className={`mt-1.5 ${textareaClass}`}
        />
      </section>
    </article>
  );
}
