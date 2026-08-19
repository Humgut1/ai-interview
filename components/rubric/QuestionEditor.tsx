"use client";

import type { DragEvent } from "react";
import {
  Field,
  errorInputClass,
  textareaClass,
} from "@/components/ui/Field";
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
  errors?: QuestionErrors;
  showErrors: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  draggable: boolean;
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

export default function QuestionEditor({
  question,
  index,
  total,
  percent,
  errors,
  showErrors,
  isDragging,
  isDropTarget,
  draggable,
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
  const followUpOptions = Array.from({ length: MAX_FOLLOW_UPS + 1 }, (_, i) => i);

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`질문 ${index + 1}`}
      className={[
        "rounded-md border bg-surface shadow-sm transition",
        isDragging ? "opacity-50" : "opacity-100",
        isDropTarget ? "border-accent ring-2 ring-accent/12" : "border-line",
      ].join(" ")}
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <button
          type="button"
          aria-label={`질문 ${index + 1} 순서 옮기기`}
          title="끌어서 순서를 바꿀 수 있습니다"
          onMouseDown={onHandleGrab}
          onTouchStart={onHandleGrab}
          className="cursor-grab rounded-md px-1.5 py-1 text-ink-3 hover:bg-mute hover:text-ink-2 active:cursor-grabbing"
        >
          ⠿
        </button>

        <span className="rounded-full bg-mute px-2.5 py-1 text-xs font-semibold text-ink-2">
          질문 {index + 1}
        </span>
        <span className="text-xs text-ink-3">전체의 {percent}%</span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="위로 이동"
            className="rounded-md px-2 py-1 text-sm text-ink-3 hover:bg-mute disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="아래로 이동"
            className="rounded-md px-2 py-1 text-sm text-ink-3 hover:bg-mute disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-sm text-ink-3 hover:bg-rose-50 hover:text-rose-600"
          >
            삭제
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        <Field
          label="질문"
          htmlFor={`${question.id}-text`}
          required
          error={visibleErrors?.text}
        >
          <textarea
            id={`${question.id}-text`}
            rows={2}
            value={question.text}
            onChange={(event) => onPatch({ text: event.target.value })}
            placeholder="후보자에게 그대로 보여줄 문장을 적어 주세요."
            className={`${textareaClass} ${visibleErrors?.text ? errorInputClass : ""}`}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-medium text-ink">평가 기준</h3>
            <p className="text-xs text-ink-3">
              AI 는 여기 적힌 내용으로만 채점합니다. 말투·성격·유창성은 평가하지
              않습니다.
            </p>
          </div>

          {CRITERIA_META.map((meta) => (
            <div
              key={meta.key}
              className="flex flex-col gap-1.5 sm:flex-row sm:gap-3"
            >
              <div className="sm:w-40 sm:shrink-0">
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.accent}`}
                >
                  {meta.label}
                </span>
                <p className="mt-1 hidden text-xs text-ink-3 sm:block">
                  {meta.hint}
                </p>
              </div>
              <textarea
                rows={2}
                aria-label={`${meta.label} 답변 기준`}
                value={question.criteria[meta.key]}
                onChange={(event) =>
                  onCriteriaChange(meta.key, event.target.value)
                }
                placeholder={meta.hint}
                className={`${textareaClass} ${
                  visibleErrors?.criteria && !question.criteria[meta.key].trim()
                    ? errorInputClass
                    : ""
                }`}
              />
            </div>
          ))}

          {visibleErrors?.criteria ? (
            <p role="alert" className="text-xs text-rose-600">
              {visibleErrors.criteria}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
          <Field
            label="비중"
            hint={`전체 점수에서 차지하는 몫 (${percent}%)`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="비중 줄이기"
                onClick={() => onPatch({ weight: question.weight - 1 })}
                disabled={question.weight <= MIN_WEIGHT}
                className="h-9 w-9 rounded-md border border-line-strong text-ink-2 hover:bg-canvas disabled:opacity-30"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold text-ink">
                {question.weight}
              </span>
              <button
                type="button"
                aria-label="비중 늘리기"
                onClick={() => onPatch({ weight: question.weight + 1 })}
                disabled={question.weight >= MAX_WEIGHT}
                className="h-9 w-9 rounded-md border border-line-strong text-ink-2 hover:bg-canvas disabled:opacity-30"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="후속 질문 최대 횟수" hint="답변이 부실할 때 되묻는 횟수">
            <div className="flex gap-1.5">
              {followUpOptions.map((count) => {
                const selected = question.maxFollowUps === count;
                return (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onPatch({ maxFollowUps: count })}
                    className={[
                      "h-9 w-10 rounded-md border text-sm transition",
                      selected
                        ? "border-accent bg-accent-soft font-semibold text-accent"
                        : "border-line-strong text-ink-2 hover:bg-canvas",
                    ].join(" ")}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>
    </article>
  );
}
