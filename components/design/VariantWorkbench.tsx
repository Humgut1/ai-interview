import {
  emptyReview,
  levelMeta,
  levelOf,
  messagesFor,
  reportTotals,
  splitByQuote,
} from "@/lib/review";
import { weightPercents } from "@/lib/rubric";
import type { InterviewReport } from "@/lib/types";

/**
 * 시안 B — 워크벤치형.
 * 채용 도구들이 쓰는 "오른쪽 검토 레일" 패턴.
 * 왼쪽에서 문항을 고르고, 가운데서 답변을 읽고, 오른쪽에서 점수를 고친다.
 * 판단에 필요한 조작이 스크롤과 무관하게 항상 같은 자리에 있다.
 */
export default function VariantWorkbench({
  report,
}: {
  report: InterviewReport;
}) {
  const review = emptyReview();
  const totals = reportTotals(report, review);
  const percents = weightPercents(report.questions);
  const active = report.questions[1];
  const activeScore = report.scores.find(
    (item) => item.questionId === active.id
  );

  return (
    <div className="bg-slate-100 p-4">
      <div className="grid h-[36rem] min-w-[54rem] grid-cols-[13rem_1fr_17rem] gap-3">
        <aside className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-xs text-slate-500">{report.jobTitle}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {report.candidateLabel}
            </p>
          </div>

          <nav className="flex flex-col gap-1 p-2">
            {report.questions.map((question, index) => {
              const score = report.scores.find(
                (item) => item.questionId === question.id
              );
              const meta = levelMeta(levelOf(score?.score ?? 0));
              const current = question.id === active.id;

              return (
                <div
                  key={question.id}
                  className={`rounded-lg px-2.5 py-2 ${
                    current ? "bg-slate-900 text-white" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] opacity-70">
                      문항 {index + 1} · {percents[question.id]}%
                    </span>
                    <span
                      className={`rounded px-1.5 text-[11px] font-semibold tabular-nums ${
                        current ? "bg-white/15" : meta.accent
                      }`}
                    >
                      {score?.score}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug">
                    {question.text}
                  </p>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
            전체 대화 {report.transcript.length}개 발언
          </div>
        </aside>

        <section className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] text-slate-500">
            문항 2 · 비중 {percents[active.id]}%
          </p>
          <h2 className="mt-1 text-sm leading-relaxed font-semibold text-slate-900">
            {active.text}
          </h2>

          <div className="mt-4 flex flex-col gap-3">
            {messagesFor(report, active.id).map((message) => {
              if (message.role === "ai") {
                return (
                  <p key={message.id} className="text-xs text-slate-500">
                    <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-semibold">
                      {message.kind === "followUp" ? "후속" : "질문"}
                    </span>
                    {message.text}
                  </p>
                );
              }

              const quote = activeScore?.evidence.find(
                (item) => item.messageId === message.id
              )?.quote;
              const split = quote ? splitByQuote(message.text, quote) : null;

              return (
                <p
                  key={message.id}
                  className="rounded-lg bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800"
                >
                  {split ? (
                    <>
                      {split.before}
                      <mark className="rounded bg-blue-100 px-0.5">
                        {split.match}
                      </mark>
                      {split.after}
                    </>
                  ) : (
                    message.text
                  )}
                </p>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 p-3">
            <p className="text-[11px] font-semibold text-slate-500">
              대면에서 확인할 질문
            </p>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-slate-700">
              {activeScore?.followUps.map((followUp) => (
                <li key={followUp}>· {followUp}</li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-white">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-400">종합 점수</p>
            <p className="text-3xl font-bold tabular-nums">{totals.final}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {report.summary}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-[11px] font-semibold text-slate-400">
              이 문항 채점 근거
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
              {activeScore?.rationale}
            </p>

            <p className="mt-4 text-[11px] font-semibold text-slate-400">
              점수 고치기
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-white/10 text-sm"
              >
                −
              </button>
              <span className="min-w-10 text-center text-xl font-bold tabular-nums">
                {activeScore?.score}
              </span>
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-white/10 text-sm"
              >
                +
              </button>
              <span className="text-[11px] text-slate-400">
                AI {activeScore?.score}
              </span>
            </div>

            <textarea
              rows={3}
              readOnly
              placeholder="수정 사유 메모"
              className="mt-3 w-full resize-none rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              className="w-full rounded-lg bg-white py-2 text-xs font-semibold text-slate-900"
            >
              검토 완료 · 다음 후보자
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
