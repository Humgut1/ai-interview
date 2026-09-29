"use client";

import type { DragEvent } from "react";
import Seg from "@/components/ui/Seg";
import { errorInputClass, textareaClass } from "@/components/ui/Field";
import type { QuestionErrors } from "@/lib/rubric";
import {
  CRITERIA_META,
  MAX_FOLLOW_UPS,
  MAX_WEIGHT,
  MIN_WEIGHT,
  type CriteriaLevel,
  type Question,
} from "@/lib/types";

type Props = {
  question: Question;
  index: number;
  total: number;
  percent: number;
  open: boolean;
  errors?: QuestionErrors;
  showErrors: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  draggable: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<Question>) => void;
  onCriteriaChange: (level: CriteriaLevel, value: string) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onHandleGrab: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

const smallBtn =
  "h-8 rounded-md px-2.5 text-[13px] text-ink-2 hover:bg-mute disabled:opacity-30 disabled:hover:bg-transparent";

/** D2 질문 카드 — 접으면 한 줄(번호·문장·비중), 펼치면 문장·평가 기준·되묻기·비중. */
export default function QuestionEditor({
  question,
  index,
  total,
  percent,
  open,
  errors,
  showErrors,
  isDragging,
  isDropTarget,
  draggable,
  onToggle,
  onPatch,
  onCriteriaChange,
  onRemove,
  onMove,
  onHandleGrab,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const visibleErrors = showErrors ? errors : undefined;
  const bodyId = `${question.id}-body`;

  return (
    <article
      id={`q-${question.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`질문 ${index + 1}`}
      className={[
        "scroll-mt-6 rounded-lg border bg-surface transition",
        isDragging ? "opacity-50" : "opacity-100",
        isDropTarget ? "border-ink" : "border-line",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          aria-label={`질문 ${index + 1} 순서 옮기기`}
          title="끌어서 순서 바꾸기"
          onMouseDown={onHandleGrab}
          onTouchStart={onHandleGrab}
          className="cursor-grab rounded-md px-1 py-1 text-ink-3 hover:bg-mute hover:text-ink-2 active:cursor-grabbing"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm"
        >
          <span className="num shrink-0 font-semibold text-ink">질문 {index + 1}</span>
          {visibleErrors ? (
            <span aria-label="빈칸 있음" className="h-[7px] w-[7px] shrink-0 rounded-full bg-st-bad" />
          ) : null}
          <span className={`min-w-0 flex-1 truncate ${question.text.trim() ? "text-ink-2" : "text-ink-3"}`}>
            {open ? "" : question.text.trim() || "질문을 적어 주세요"}
          </span>
          <span className="num shrink-0 text-[13px] text-ink-3">{percent}%</span>
          <span className="shrink-0 text-[13px] text-ink-3">{open ? "접기" : "펼치기"}</span>
        </button>
      </div>

      {open ? (
        <div id={bodyId} className="flex flex-col gap-3 border-t border-line px-3 py-4 sm:px-4">
          <textarea
            id={`${question.id}-text`}
            aria-label={`질문 ${index + 1} 문장`}
            rows={2}
            value={question.text}
            onChange={(event) => onPatch({ text: event.target.value })}
            placeholder="후보자에게 그대로 보여줄 문장"
            className={`${textareaClass} ${visibleErrors?.text ? errorInputClass : ""}`}
          />
          {visibleErrors?.text ? (
            <p role="alert" className="text-xs text-st-bad">
              {visibleErrors.text}
            </p>
          ) : null}

          <p className="mt-1 text-xs font-semibold text-ink-3">평가 기준 · 후보자에게 안 보임</p>
          {CRITERIA_META.map((meta) => (
            <div key={meta.key} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2.5">
              <span className="pt-2 text-[13px] font-semibold text-ink">{meta.label}</span>
              <textarea
                rows={2}
                aria-label={`${meta.label} 답변 기준`}
                value={question.criteria[meta.key]}
                onChange={(event) => onCriteriaChange(meta.key, event.target.value)}
                placeholder={meta.hint}
                className={`${textareaClass} ${
                  visibleErrors?.criteria && !question.criteria[meta.key].trim() ? errorInputClass : ""
                }`}
              />
            </div>
          ))}
          {visibleErrors?.criteria ? (
            <p role="alert" className="text-xs text-st-bad">
              {visibleErrors.criteria}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-ink-2">되묻기 최대</span>
              <Seg
                label="되묻기 최대 횟수"
                value={question.maxFollowUps}
                options={Array.from({ length: MAX_FOLLOW_UPS + 1 }, (_, n) => ({
                  value: n,
                  label: `${n}번`,
                }))}
                onChange={(n) => onPatch({ maxFollowUps: n })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-ink-2">비중</span>
              <button
                type="button"
                aria-label="비중 줄이기"
                onClick={() => onPatch({ weight: question.weight - 1 })}
                disabled={question.weight <= MIN_WEIGHT}
                className="h-9 w-9 rounded-md border border-line-strong text-ink-2 hover:bg-canvas disabled:opacity-30"
              >
                −
              </button>
              <span className="num w-8 text-center text-sm font-semibold text-ink">{question.weight}</span>
              <button
                type="button"
                aria-label="비중 늘리기"
                onClick={() => onPatch({ weight: question.weight + 1 })}
                disabled={question.weight >= MAX_WEIGHT}
                className="h-9 w-9 rounded-md border border-line-strong text-ink-2 hover:bg-canvas disabled:opacity-30"
              >
                +
              </button>
              <span className="num text-[13px] text-ink-3">전체의 {percent}%</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="위로" className={smallBtn}>
                ↑
              </button>
              <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="아래로" className={smallBtn}>
                ↓
              </button>
              <button type="button" onClick={onRemove} className={smallBtn}>
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
