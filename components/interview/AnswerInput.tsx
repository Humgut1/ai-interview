"use client";

import { useState, type KeyboardEvent } from "react";

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
    <div className="border-t border-slate-200 bg-white px-4 py-3">
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
          className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
        />
        <div className="mt-2 flex items-center gap-3">
          <p className="text-xs text-slate-500">
            보낸 답변은 수정할 수 없습니다. · {trimmed.length}자
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="ml-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            답변 보내기
          </button>
        </div>
      </div>
    </div>
  );
}
