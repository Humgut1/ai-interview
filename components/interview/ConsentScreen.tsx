"use client";

import { useState } from "react";
import { btnPrimary, cardClass, labelClass, panelClass } from "@/components/ui/styles";
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
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-10">
      <p className={labelClass}>1차 면접 안내</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {setup.jobTitle}
      </h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        지원해 주셔서 감사합니다. 채팅으로 진행하는 1차 면접입니다. 준비되셨을 때
        시작해 주세요.
      </p>

      <dl className={`${cardClass} mt-6 grid grid-cols-3 divide-x divide-line`}>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>질문 수</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {setup.questions.length}
            <span className="ml-0.5 text-xs text-ink-3">문항</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>예상 소요</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {setup.estimatedMinutes}
            <span className="ml-0.5 text-xs text-ink-3">분</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>제한 시간</dt>
          <dd className="mt-1.5 text-xl text-ink">없음</dd>
        </div>
      </dl>

      <section className={`${cardClass} mt-4 px-5 py-4`}>
        <h2 className={labelClass}>진행 방식</h2>
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {NOTICES.map((notice, index) => (
            <li key={notice} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
              <span aria-hidden className="num shrink-0 text-xs text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-ink-2">
                {notice}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${panelClass} mt-4 px-5 py-4`}>
        <h2 className={labelClass}>답변 데이터 활용 동의</h2>
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

      {/* 화면이 길어도 시작 버튼은 늘 아래에 붙어 있게 한다. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-5 py-3">
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={onStart}
            disabled={!agreed}
            className={`${btnPrimary} w-full py-3`}
          >
            면접 시작하기
          </button>
          {agreed ? null : (
            <p className="mt-1.5 text-center text-xs text-ink-3">
              동의하셔야 시작할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
