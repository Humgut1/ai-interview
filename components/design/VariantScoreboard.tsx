import {
  answersFor,
  emptyReview,
  levelMeta,
  levelOf,
  reportTotals,
  splitByQuote,
} from "@/lib/review";
import { weightPercents } from "@/lib/rubric";
import type { CandidateRow, InterviewReport } from "@/lib/types";

/**
 * 시안 C — 스코어보드형.
 * 하루에 여러 후보자를 몰아서 볼 때를 가정한 안.
 * 위에서 종합 점수를 한눈에 보고, 아래 문항은 접었다 펴며 필요한 것만 읽는다.
 */

const BAR_COLOR: Record<string, string> = {
  excellent: "bg-emerald-500",
  average: "bg-amber-500",
  poor: "bg-rose-500",
};

const CHIP_COLOR: Record<string, string> = {
  excellent: "bg-emerald-500/15 text-emerald-300",
  average: "bg-amber-500/15 text-amber-300",
  poor: "bg-rose-500/15 text-rose-300",
};

function Donut({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (circumference * value) / 100;

  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-white/15"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        className="text-emerald-400"
      />
    </svg>
  );
}

export default function VariantScoreboard({
  report,
  candidates,
}: {
  report: InterviewReport;
  candidates: CandidateRow[];
}) {
  const review = emptyReview();
  const totals = reportTotals(report, review);
  const percents = weightPercents(report.questions);

  return (
    <div className="bg-zinc-100">
      <header className="bg-zinc-900 px-6 py-6 text-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-6">
          <div className="relative flex items-center justify-center">
            <Donut value={totals.final} />
            <span className="absolute text-xl font-bold tabular-nums">
              {totals.final}
            </span>
          </div>

          <div className="min-w-52 flex-1">
            <p className="text-xs text-zinc-400">{report.jobTitle}</p>
            <h1 className="text-xl font-bold">{report.candidateLabel}</h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {report.summary}
            </p>
          </div>

          <div className="flex gap-2">
            {report.scores.map((score, index) => (
              <div
                key={score.questionId}
                className={`rounded-lg px-3 py-2 text-center ${
                  CHIP_COLOR[levelOf(score.score)]
                }`}
              >
                <p className="text-[10px] opacity-80">문항 {index + 1}</p>
                <p className="text-base font-bold tabular-nums">
                  {score.score}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-6">
        {report.questions.map((question, index) => {
          const score = report.scores.find(
            (item) => item.questionId === question.id
          );
          if (!score) return null;
          const level = levelOf(score.score);
          const meta = levelMeta(level);
          const answer = answersFor(report, question.id)[0];
          const quote = score.evidence[0]?.quote;
          const split =
            answer && quote ? splitByQuote(answer.text, quote) : null;

          return (
            <details
              key={question.id}
              open={index === 0}
              className="rounded-xl border border-zinc-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                <span className="w-12 text-2xl font-bold text-zinc-900 tabular-nums">
                  {score.score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900">
                    {question.text}
                  </span>
                  <span className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <span
                      className={`h-full rounded-full ${BAR_COLOR[level]}`}
                      style={{ width: `${score.score}%` }}
                    />
                  </span>
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.accent}`}
                >
                  {meta.label}
                </span>
                <span className="text-xs text-zinc-400">
                  비중 {percents[question.id]}%
                </span>
              </summary>

              <div className="border-t border-zinc-100 p-4">
                <p className="text-[13px] leading-relaxed text-zinc-700">
                  {split ? (
                    <>
                      {split.before}
                      <mark className="rounded bg-emerald-100 px-0.5">
                        {split.match}
                      </mark>
                      {split.after}
                    </>
                  ) : (
                    answer?.text
                  )}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold text-zinc-500">
                      채점 근거
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-700">
                      {score.rationale}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold text-zinc-500">
                      대면에서 확인할 질문
                    </p>
                    <ul className="mt-1 flex flex-col gap-1 text-xs text-zinc-700">
                      {score.followUps.map((followUp) => (
                        <li key={followUp}>· {followUp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          );
        })}

        <section className="mt-2 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold text-zinc-500">
            같은 직무 후보자
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {candidates.map((row) => {
              const meta = levelMeta(levelOf(row.aiScore));
              return (
                <div
                  key={row.reportId}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-zinc-800">
                    {row.candidateLabel}
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${meta.accent}`}
                  >
                    {row.aiScore}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {row.status}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-zinc-400">
            점수 순으로 줄을 세우지 않습니다. 순위표가 되는 순간 AI 점수가
            합불처럼 읽힙니다.
          </p>
        </section>
      </div>
    </div>
  );
}
