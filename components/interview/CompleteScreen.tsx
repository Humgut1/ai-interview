"use client";

import type { InterviewSession, InterviewSetup } from "@/lib/types";

const NEXT_STEPS = [
  "채용 담당자가 답변 내용을 검토합니다.",
  "검토 결과는 지원 시 입력하신 연락처로 안내드립니다.",
  "다음 전형이 있는 경우, 오늘 답변을 바탕으로 대면 면접이 진행될 수 있습니다.",
];

export default function CompleteScreen({
  setup,
  session,
  onRestart,
}: {
  setup: InterviewSetup;
  session: InterviewSession;
  onRestart: () => void;
}) {
  const answered = session.messages.filter(
    (message) => message.role === "candidate"
  ).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700"
      >
        ✓
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">
        면접이 끝났습니다. 수고하셨습니다.
      </h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        {setup.jobTitle} 직무의 1차 면접에 시간 내주셔서 감사합니다. 총{" "}
        {setup.questions.length}개 질문에 {answered}번 답변해 주셨습니다.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">다음 절차</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-slate-600">
              <span
                aria-hidden
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
              >
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        이 창은 닫으셔도 됩니다. 제출한 답변은 그대로 전달되었습니다.
      </p>

      {/* 화면 확인용. 4단계에서 서버 저장으로 옮기면서 없앤다. */}
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 px-4 py-3">
        <p className="text-xs text-slate-500">
          화면 확인용 기능입니다. 실제 후보자에게는 보이지 않습니다.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          이 링크의 진행 기록을 지우고 처음부터 다시 시작
        </button>
      </div>
    </div>
  );
}
