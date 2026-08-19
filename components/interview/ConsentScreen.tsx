"use client";

import { useState } from "react";
import type { InterviewSetup } from "@/lib/types";

const NOTICES = [
  "질문은 한 번에 하나씩 나옵니다. 답변을 보내면 다음 질문으로 넘어갑니다.",
  "답변이 짧으면 조금 더 자세히 여쭤보는 질문이 이어질 수 있습니다.",
  "보낸 답변은 수정할 수 없습니다. 충분히 생각한 뒤 보내 주세요.",
  "중간에 창을 닫아도 같은 링크로 다시 들어오면 이어서 진행할 수 있습니다.",
  "말투나 성격이 아니라, 미리 정해 둔 기준에 따라 답변 내용만 평가합니다.",
];

export default function ConsentScreen({
  setup,
  onStart,
}: {
  setup: InterviewSetup;
  onStart: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="text-sm font-medium text-accent">1차 면접 안내</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        {setup.jobTitle}
      </h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        지원해 주셔서 감사합니다. 채팅으로 진행하는 1차 면접입니다. 준비되셨을 때
        시작해 주세요.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">질문 수</dt>
          <dd className="mt-1 text-lg font-semibold text-ink">
            {setup.questions.length}문항
          </dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">예상 소요 시간</dt>
          <dd className="mt-1 text-lg font-semibold text-ink">
            약 {setup.estimatedMinutes}분
          </dd>
        </div>
      </dl>

      <section className="mt-6 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">진행 방식</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {NOTICES.map((notice) => (
            <li key={notice} className="flex gap-2 text-sm text-ink-2">
              <span aria-hidden className="mt-0.5 text-ink-3">
                ·
              </span>
              <span className="leading-relaxed">{notice}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">
          답변 데이터 활용 동의
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          작성하신 답변은 이 채용 전형의 평가 자료로만 사용되며, 채용 담당자가
          내용을 확인합니다. 최종 합격 여부는 사람이 판단합니다.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span>위 내용을 확인했고, 답변 데이터 활용에 동의합니다.</span>
        </label>
      </section>

      <button
        type="button"
        onClick={onStart}
        disabled={!agreed}
        className="mt-6 w-full rounded-md bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-mute"
      >
        면접 시작하기
      </button>
      {agreed ? null : (
        <p className="mt-2 text-center text-xs text-ink-3">
          동의하셔야 시작할 수 있습니다.
        </p>
      )}
    </div>
  );
}
