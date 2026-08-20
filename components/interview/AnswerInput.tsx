"use client";

import { useState, type KeyboardEvent } from "react";
import { btnPrimary } from "@/components/ui/styles";

export default function AnswerInput({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const canSubmit = !disabled && trimmed.length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
    setText("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-line bg-surface px-4 py-3">
      <div className="mx-auto w-full max-w-2xl">
        <textarea
          rows={3}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "답변을 읽는 중입니다…"
              : "편하게 작성해 주세요. 경험을 구체적으로 적을수록 좋습니다."
          }
          aria-label="답변 입력"
          className="w-full resize-none rounded-md border border-line-strong bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12 disabled:bg-canvas"
        />
        <div className="mt-2 flex items-center gap-3">
          <p className="text-xs text-ink-3">
            보낸 답변은 수정할 수 없습니다. ·{" "}
            <span className="num">{trimmed.length}</span>자
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`${btnPrimary} ml-auto px-5`}
          >
            답변 보내기
          </button>
        </div>
      </div>
    </div>
  );
}
