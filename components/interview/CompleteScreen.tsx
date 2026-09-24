"use client";

import { cardClass, labelClass } from "@/components/ui/styles";
import type { InterviewSession, InterviewSetup } from "@/lib/types";

const NEXT_STEPS = [
  "채용 담당자가 답변 내용을 검토합니다.",
  "검토 결과는 지원 시 입력하신 연락처로 안내드립니다.",
  "다음 전형이 있는 경우, 오늘 답변을 바탕으로 대면 면접이 진행될 수 있습니다.",
];

export default function CompleteScreen({
  setup,
  session,
}: {
  setup: InterviewSetup;
  session: InterviewSession;
}) {
  const answered = session.messages.filter(
    (message) => message.role === "candidate"
  ).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <p className={labelClass}>제출 완료</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        면접이 끝났습니다. 수고하셨습니다.
      </h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        {setup.jobTitle} 직무의 1차 면접에 시간 내주셔서 감사합니다.
      </p>

      <dl className={`${cardClass} mt-6 grid grid-cols-2 divide-x divide-line`}>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>받은 질문</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {setup.questions.length}
            <span className="ml-0.5 text-xs text-ink-3">문항</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>보낸 답변</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {answered}
            <span className="ml-0.5 text-xs text-ink-3">회</span>
          </dd>
        </div>
      </dl>

      <section className={`${cardClass} mt-4 px-5 py-4`}>
        <h2 className={labelClass}>다음 절차</h2>
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
              <span aria-hidden className="num shrink-0 text-xs text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-ink-2">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-sm text-ink-3">
        이 창은 닫으셔도 됩니다. 제출한 답변은 그대로 전달되었습니다.
      </p>

    </div>
  );
}
