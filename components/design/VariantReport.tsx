import {
  answersFor,
  clockOf,
  dateOf,
  levelMeta,
  levelOf,
  reportTotals,
  emptyReview,
  splitByQuote,
} from "@/lib/review";
import { weightPercents } from "@/lib/rubric";
import type { InterviewReport } from "@/lib/types";

/**
 * 시안 A — 리포트형.
 * "읽고, 인쇄하고, 그대로 공유하는 문서" 를 목표로 한 안.
 * 카드 테두리를 없애고 구분선과 여백으로만 문단을 나눈다.
 */
export default function VariantReport({ report }: { report: InterviewReport }) {
  const review = emptyReview();
  const totals = reportTotals(report, review);
  const percents = weightPercents(report.questions);

  return (
    <div className="bg-stone-50 px-8 py-12">
      <article className="mx-auto w-full max-w-2xl">
        <p className="text-xs tracking-widest text-stone-500 uppercase">
          Interview report
        </p>
        <h1 className="mt-3 text-3xl leading-snug font-semibold text-stone-900">
          {report.candidateLabel} · {report.jobTitle}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {dateOf(report.completedAt)} {clockOf(report.completedAt)} 완료 ·{" "}
          {report.durationMinutes}분 · 질문 {report.questions.length}개
        </p>

        <div className="mt-8 flex items-end gap-6 border-y border-stone-300 py-6">
          <div>
            <p className="text-xs text-stone-500">종합</p>
            <p className="text-5xl leading-none font-semibold text-stone-900 tabular-nums">
              {totals.final}
            </p>
          </div>
          <div className="flex-1">
            <div className="h-1.5 w-full rounded-full bg-stone-200">
              <div
                className="h-1.5 rounded-full bg-stone-900"
                style={{ width: `${totals.final}%` }}
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {report.summary}
            </p>
          </div>
        </div>

        {report.questions.map((question, index) => {
          const score = report.scores.find(
            (item) => item.questionId === question.id
          );
          if (!score) return null;
          const meta = levelMeta(levelOf(score.score));

          return (
            <section
              key={question.id}
              className="border-b border-stone-200 py-8 last:border-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-xs tracking-wider text-stone-500">
                  문항 {index + 1} · 비중 {percents[question.id]}%
                </p>
                <p className="text-lg font-semibold text-stone-900 tabular-nums">
                  {score.score}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {meta.label}
                  </span>
                </p>
              </div>

              <h2 className="mt-2 leading-relaxed font-semibold text-stone-900">
                {question.text}
              </h2>

              {answersFor(report, question.id).map((message) => {
                const quotes = score.evidence
                  .filter((item) => item.messageId === message.id)
                  .map((item) => item.quote);
                const split = quotes[0]
                  ? splitByQuote(message.text, quotes[0])
                  : null;

                return (
                  <p
                    key={message.id}
                    className="mt-4 text-[15px] leading-8 text-stone-700"
                  >
                    {split ? (
                      <>
                        {split.before}
                        <mark className="bg-amber-100 text-stone-900">
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

              <p className="mt-5 border-l-2 border-stone-900 pl-4 text-sm leading-relaxed text-stone-600">
                <span className="font-semibold text-stone-900">채점 근거 </span>
                {score.rationale}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs text-stone-500">담당자 점수</span>
                <span className="rounded-sm border border-stone-300 bg-white px-3 py-1 tabular-nums">
                  {score.score}
                </span>
                <span className="text-xs text-stone-400">
                  고치면 이 자리에 사유를 적습니다
                </span>
              </div>
            </section>
          );
        })}

        <footer className="mt-4 text-xs leading-relaxed text-stone-500">
          이 리포트의 모든 점수에는 근거가 된 발언이 함께 기록돼 있습니다.
          합격 여부는 담당자가 정합니다.
        </footer>

        <p className="mt-6 text-xs text-stone-400">
          전체 대화 {report.transcript.length}개 발언은 문서 끝에 첨부됩니다.
        </p>
      </article>
    </div>
  );
}
