"use client";

import { useMemo } from "react";
import { textareaClass } from "@/components/ui/Field";
import {
  MAX_SCORE,
  MIN_SCORE,
  clampScore,
  effectiveScore,
  isOverridden,
  levelMeta,
  levelOf,
  splitByQuote,
} from "@/lib/review";
import { CRITERIA_META } from "@/lib/types";
import type {
  ChatMessage,
  Question,
  QuestionScore,
  RecruiterReview,
} from "@/lib/types";

type Piece = { text: string; highlighted: boolean };

/** 답변 원문에서 근거로 인용된 부분만 잘라 표시용 조각으로 나눈다. */
function toPieces(text: string, quotes: string[]): Piece[] {
  let pieces: Piece[] = [{ text, highlighted: false }];

  for (const quote of quotes) {
    pieces = pieces.flatMap((piece) => {
      if (piece.highlighted) return [piece];
      const split = splitByQuote(piece.text, quote);
      if (!split) return [piece];
      return [
        { text: split.before, highlighted: false },
        { text: split.match, highlighted: true },
        { text: split.after, highlighted: false },
      ].filter((part) => part.text.length > 0);
    });
  }

  return pieces;
}

export default function ScoreCard({
  index,
  question,
  score,
  percent,
  messages,
  review,
  onOverride,
  onMemo,
}: {
  index: number;
  question: Question;
  score: QuestionScore;
  percent: number;
  /** 이 질문에서 오간 발언 (후속 질문과 그 답변 포함) */
  messages: ChatMessage[];
  review: RecruiterReview;
  onOverride: (questionId: string, value: number | null) => void;
  onMemo: (questionId: string, memo: string) => void;
}) {
  const final = effectiveScore(score, review);
  const changed = isOverridden(score, review);
  const shownMeta = levelMeta(levelOf(final));

  const quotesByMessage = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const item of score.evidence) {
      map[item.messageId] = [...(map[item.messageId] ?? []), item.quote];
    }
    return map;
  }, [score.evidence]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">문항 {index + 1}</span>
          <span aria-hidden>·</span>
          <span>비중 {percent}%</span>
        </div>
        <h3 className="mt-2 font-semibold leading-relaxed text-slate-900">
          {question.text}
        </h3>
      </header>

      <div className="flex flex-wrap items-center gap-5 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs text-slate-500">AI 점수</p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              changed ? "text-slate-400 line-through" : "text-slate-900"
            }`}
          >
            {score.score}
          </p>
        </div>

        {changed ? (
          <div>
            <p className="text-xs text-slate-500">담당자 수정 점수</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {final}
            </p>
          </div>
        ) : null}

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${shownMeta.accent}`}
        >
          {shownMeta.label}
        </span>
      </div>

      <section className="border-b border-slate-100 px-5 py-4">
        <h4 className="text-xs font-semibold text-slate-500">채점 근거</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {score.rationale}
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {score.evidence.map((item) => (
            <li
              key={`${item.messageId}-${item.quote}`}
              className="rounded-lg border-l-2 border-blue-400 bg-blue-50/60 px-3 py-2 text-sm leading-relaxed text-slate-700"
            >
              <span className="mr-1.5 text-xs font-semibold text-blue-700">
                근거가 된 발언
              </span>
              &ldquo;{item.quote}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      <section className="border-b border-slate-100 px-5 py-4">
        <h4 className="text-xs font-semibold text-slate-500">답변 전문</h4>
        <div className="mt-2 flex flex-col gap-3">
          {messages.map((message) =>
            message.role === "ai" ? (
              <p
                key={message.id}
                className="text-sm leading-relaxed text-slate-500"
              >
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {message.kind === "followUp" ? "후속 질문" : "질문"}
                </span>
                {message.text}
              </p>
            ) : (
              <p
                key={message.id}
                className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
              >
                {toPieces(message.text, quotesByMessage[message.id] ?? []).map(
                  (piece, pieceIndex) =>
                    piece.highlighted ? (
                      <mark
                        key={pieceIndex}
                        className="rounded bg-blue-100 px-0.5 text-slate-900"
                      >
                        {piece.text}
                      </mark>
                    ) : (
                      <span key={pieceIndex}>{piece.text}</span>
                    )
                )}
              </p>
            )
          )}
        </div>
      </section>

      <details className="border-b border-slate-100 px-5 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500">
          이 문항의 평가 기준 보기
        </summary>
        <dl className="mt-3 flex flex-col gap-2">
          {CRITERIA_META.map((meta) => (
            <div key={meta.key} className="flex gap-2.5">
              <dt
                className={`h-fit shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.accent}`}
              >
                {meta.label}
              </dt>
              <dd className="text-sm leading-relaxed text-slate-600">
                {question.criteria[meta.key]}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <section className="border-b border-slate-100 px-5 py-4">
        <h4 className="text-xs font-semibold text-slate-500">
          대면 면접에서 더 확인할 질문
        </h4>
        <ul className="mt-2 flex flex-col gap-1.5">
          {score.followUps.map((followUp) => (
            <li
              key={followUp}
              className="flex gap-2 text-sm leading-relaxed text-slate-700"
            >
              <span aria-hidden className="text-slate-400">
                &ndash;
              </span>
              {followUp}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`score-${question.id}`}
            className="text-xs font-semibold text-slate-500"
          >
            점수 수정
          </label>
          <input
            id={`score-${question.id}`}
            type="number"
            min={MIN_SCORE}
            max={MAX_SCORE}
            value={final}
            onChange={(event) =>
              onOverride(question.id, clampScore(Number(event.target.value)))
            }
            className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-slate-400">/ {MAX_SCORE}</span>

          {changed ? (
            <button
              type="button"
              onClick={() => onOverride(question.id, null)}
              className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              AI 점수({score.score})로 되돌리기
            </button>
          ) : null}
        </div>

        <label
          htmlFor={`memo-${question.id}`}
          className="mt-4 block text-xs font-semibold text-slate-500"
        >
          담당자 메모
        </label>
        <textarea
          id={`memo-${question.id}`}
          rows={2}
          value={review.memos[question.id] ?? ""}
          onChange={(event) => onMemo(question.id, event.target.value)}
          placeholder="점수를 고쳤다면 그 이유를 남겨 주세요. 나중에 왜 그렇게 판단했는지 확인할 수 있습니다."
          className={`mt-1.5 ${textareaClass}`}
        />
      </section>
    </article>
  );
}
