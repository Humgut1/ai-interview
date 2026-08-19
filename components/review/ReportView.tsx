"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CandidateTable from "@/components/review/CandidateTable";
import ScoreCard from "@/components/review/ScoreCard";
import TranscriptView from "@/components/review/TranscriptView";
import { textareaClass } from "@/components/ui/Field";
import {
  answerCountOf,
  clockOf,
  dateOf,
  emptyReview,
  levelMeta,
  levelOf,
  messagesFor,
  reportTotals,
} from "@/lib/review";
import { weightPercents } from "@/lib/rubric";
import type {
  CandidateRow,
  InterviewReport,
  RecruiterReview,
} from "@/lib/types";

export default function ReportView({
  report,
  candidates,
}: {
  report: InterviewReport;
  candidates: CandidateRow[];
}) {
  const [review, setReview] = useState<RecruiterReview>(emptyReview);
  const [toast, setToast] = useState<string | null>(null);

  const percents = useMemo(
    () => weightPercents(report.questions),
    [report.questions]
  );
  const totals = reportTotals(report, review);
  const finalMeta = levelMeta(levelOf(totals.final));

  function handleOverride(questionId: string, value: number | null) {
    setReview((prev) => {
      const overrides = { ...prev.overrides };
      if (value === null) {
        delete overrides[questionId];
      } else {
        overrides[questionId] = value;
      }
      return { ...prev, overrides };
    });
  }

  function handleMemo(questionId: string, memo: string) {
    setReview((prev) => ({
      ...prev,
      memos: { ...prev.memos, [questionId]: memo },
    }));
  }

  function handleSave() {
    // 4단계에서 Supabase 저장으로 교체한다. 지금은 화면 동작만 확인한다.
    console.log("검토 결과", { reportId: report.id, review });
    setToast("검토 내용을 저장했습니다. (지금은 화면 확인용입니다)");
    setTimeout(() => setToast(null), 2600);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 pb-28">
      <Link
        href="/"
        className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
      >
        &larr; 처음으로
      </Link>

      <header className="mt-4">
        <p className="text-sm text-slate-500">{report.jobTitle}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {report.candidateLabel} 면접 결과
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {dateOf(report.completedAt)} {clockOf(report.completedAt)} 완료 ·{" "}
          {report.durationMinutes}분 소요 · 답변{" "}
          {answerCountOf(report.transcript)}회
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-slate-500">종합 점수 (비중 반영)</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-slate-900">
                {totals.final}
              </span>
              <span className="text-sm text-slate-400">/ 100</span>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${finalMeta.accent}`}
              >
                {finalMeta.label}
              </span>
            </p>
          </div>

          {totals.changedCount > 0 ? (
            <div>
              <p className="text-xs text-slate-500">AI 원점수</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-400">
                {totals.ai}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {totals.changedCount}개 문항 수정됨
                </span>
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 leading-relaxed text-slate-700">{report.summary}</p>
      </section>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        이 점수는 <strong>판단을 돕는 자료</strong>일 뿐입니다. 합격 여부는
        담당자가 정합니다. 점수가 실제 답변과 맞지 않는다고 판단되면 아래에서
        직접 고치고, 그 이유를 메모로 남겨 주세요.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">문항별 채점</h2>
        <div className="mt-3 flex flex-col gap-5">
          {report.questions.map((question, index) => {
            const score = report.scores.find(
              (item) => item.questionId === question.id
            );
            if (!score) return null;

            return (
              <ScoreCard
                key={question.id}
                index={index}
                question={question}
                score={score}
                percent={percents[question.id] ?? 0}
                messages={messagesFor(report, question.id)}
                review={review}
                onOverride={handleOverride}
                onMemo={handleMemo}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          종합 메모 (담당자 작성)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          다음 전형으로 넘길지, 무엇을 더 확인할지 적어 두면 다른 담당자도 같은
          맥락에서 볼 수 있습니다.
        </p>
        <textarea
          rows={3}
          value={review.overallMemo}
          onChange={(event) =>
            setReview((prev) => ({ ...prev, overallMemo: event.target.value }))
          }
          placeholder="예) 장애 대응 경험은 충분해 보임. 협업 부분은 대면에서 사례를 하나 더 확인 필요."
          className={`mt-3 ${textareaClass}`}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">
          같은 직무 후보자
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          점수순으로 줄을 세우지 않습니다. 각자의 답변을 보고 판단해 주세요.
        </p>
        <div className="mt-3">
          <CandidateTable rows={candidates} currentReportId={report.id} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">전체 트랜스크립트</h2>
        <div className="mt-3">
          <TranscriptView transcript={report.transcript} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {totals.changedCount > 0
              ? `${totals.changedCount}개 문항의 점수를 고쳤습니다.`
              : "AI 점수를 그대로 두고 있습니다."}
          </p>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            검토 내용 저장
          </button>
        </div>
      </div>

      {toast ? (
        <p
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {toast}
        </p>
      ) : null}
    </main>
  );
}
