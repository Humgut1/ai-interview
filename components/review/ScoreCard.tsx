"use client";

import { useMemo } from "react";
import { textareaClass } from "@/components/ui/Field";
import {
  barFillClass,
  barTrackClass,
  cardClass,
  evidenceClass,
  labelClass,
  panelClass,
} from "@/components/ui/styles";
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

const stepClass =
  "h-8 w-8 rounded-md border border-line-strong bg-surface text-base leading-none text-ink-2 transition hover:bg-canvas disabled:text-ink-3";

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
    <article className={cardClass}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-b border-line px-5 py-4">
        <div className="min-w-[16rem] flex-1">
          <p className={labelClass}>
            문항 {index + 1} &nbsp;·&nbsp; 비중 {percent}%
          </p>
          <h3 className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
            {question.text}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <p className="flex items-baseline justify-end gap-2">
            {changed ? (
              <span className="num text-sm text-ink-3 line-through">
                {score.score}
              </span>
            ) : null}
            <span className="num text-3xl font-medium text-ink">{final}</span>
            <span className="text-xs text-ink-3">/ {MAX_SCORE}</span>
          </p>
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${shownMeta.accent}`}
          >
            {shownMeta.label}
          </span>
          <div className={`${barTrackClass} mt-2 w-36`}>
            <div className={barFillClass} style={{ width: `${final}%` }} />
          </div>
        </div>
      </header>

      <section className="px-5 py-4">
        <p className={labelClass}>채점 근거</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {score.rationale}
        </p>

        <ul className={`${panelClass} mt-3 flex flex-col gap-2 px-4 py-3`}>
          {score.evidence.map((item) => (
            <li
              key={`${item.messageId}-${item.quote}`}
              className="text-sm leading-relaxed text-ink"
            >
              <span className="mr-1.5 text-[11px] font-semibold text-ink-3">
                근거가 된 발언
              </span>
              <span className={evidenceClass}>
                &ldquo;{item.quote}&rdquo;
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line px-5 py-4">
        <p className={labelClass}>답변 전문</p>
        <div className="mt-2.5 flex flex-col gap-3">
          {messages.map((message) =>
            message.role === "ai" ? (
              <p key={message.id} className="text-sm leading-relaxed text-ink-3">
                <span className="mr-1.5 rounded-sm bg-mute px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">
                  {message.kind === "followUp" ? "후속 질문" : "질문"}
                </span>
                {message.text}
              </p>
            ) : (
              <p
                key={message.id}
                className="whitespace-pre-wrap border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-ink"
              >
                {toPieces(message.text, quotesByMessage[message.id] ?? []).map(
                  (piece, pieceIndex) =>
                    piece.highlighted ? (
                      <mark
                        key={pieceIndex}
                        className={`${evidenceClass} text-ink`}
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

      <details className="border-t border-line px-5 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-ink-3">
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
              <dd className="text-sm leading-relaxed text-ink-2">
                {question.criteria[meta.key]}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <section className="border-t border-line px-5 py-4">
        <p className={labelClass}>대면 면접에서 더 확인할 질문</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {score.followUps.map((followUp) => (
            <li
              key={followUp}
              className="flex gap-2 text-sm leading-relaxed text-ink-2"
            >
              <span aria-hidden className="text-ink-3">
                &ndash;
              </span>
              {followUp}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-canvas px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`score-${question.id}`}
            className={`${labelClass} mr-1`}
          >
            점수 수정
          </label>

          <button
            type="button"
            aria-label="1점 내리기"
            disabled={final <= MIN_SCORE}
            onClick={() => onOverride(question.id, clampScore(final - 1))}
            className={stepClass}
          >
            &minus;
          </button>
          <input
            id={`score-${question.id}`}
            type="number"
            min={MIN_SCORE}
            max={MAX_SCORE}
            value={final}
            onChange={(event) =>
              onOverride(question.id, clampScore(Number(event.target.value)))
            }
            className="num h-8 w-16 rounded-md border border-line-strong bg-surface px-2 text-center text-sm text-ink focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
          <button
            type="button"
            aria-label="1점 올리기"
            disabled={final >= MAX_SCORE}
            onClick={() => onOverride(question.id, clampScore(final + 1))}
            className={stepClass}
          >
            +
          </button>

          {changed ? (
            <button
              type="button"
              onClick={() => onOverride(question.id, null)}
              className="ml-1 text-xs font-semibold text-ink-2 underline underline-offset-2 hover:text-ink"
            >
              AI 점수({score.score})로 되돌리기
            </button>
          ) : null}
        </div>

        <label
          htmlFor={`memo-${question.id}`}
          className={`${labelClass} mt-4 block`}
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
