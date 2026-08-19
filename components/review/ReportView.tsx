"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CandidateList from "@/components/review/CandidateList";
import ScoreCard from "@/components/review/ScoreCard";
import TranscriptView from "@/components/review/TranscriptView";
import { textareaClass } from "@/components/ui/Field";
import {
  barFillClass,
  barTrackClass,
  btnPrimary,
  btnSecondary,
  cardClass,
  labelClass,
  panelClass,
} from "@/components/ui/styles";
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
    // API 연결 단계에서 Supabase 저장으로 교체한다. 지금은 화면 동작만 확인한다.
    console.log("검토 결과", { reportId: report.id, review });
    setToast("검토 내용을 저장했습니다. (지금은 화면 확인용입니다)");
    setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-6 px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-md bg-ink"
            >
              <span className="block h-0.5 w-3 bg-white" />
            </span>
            <span className="text-sm font-semibold text-ink">AI 면접 도구</span>
          </Link>
          <span className="hidden text-sm text-ink-3 sm:inline">
            결과 검토
          </span>
          <div className="ml-auto flex items-center gap-2">
            <a href="#transcript" className={`${btnSecondary} px-3 py-1.5`}>
              대화 전문
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 py-6">
          <div>
            <p className="text-[13px] text-ink-3">
              채용 공고 &nbsp;&rsaquo;&nbsp; {report.jobTitle}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {report.candidateLabel}
            </h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {dateOf(report.completedAt)} {clockOf(report.completedAt)} 완료
              &nbsp;·&nbsp; {report.durationMinutes}분 &nbsp;·&nbsp; 답변{" "}
              {answerCountOf(report.transcript)}회
            </p>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[236px_minmax(0,1fr)_296px]">
          {/* 왼쪽 — 같은 직무 후보자 */}
          <aside
            className={`${cardClass} p-3 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}
          >
            <CandidateList rows={candidates} currentReportId={report.id} />
          </aside>

          {/* 가운데 — 채점 내용 */}
          <div className="flex flex-col gap-4">
            <section className={`${cardClass} p-5`}>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <p className={labelClass}>종합 점수 (비중 반영)</p>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className="num text-4xl font-medium text-ink">
                      {totals.final}
                    </span>
                    <span className="text-sm text-ink-3">/ 100</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${finalMeta.accent}`}
                    >
                      {finalMeta.label}
                    </span>
                  </p>
                </div>

                {totals.changedCount > 0 ? (
                  <div>
                    <p className={labelClass}>AI 원점수</p>
                    <p className="mt-1.5 text-xl">
                      <span className="num text-ink-3 line-through">
                        {totals.ai}
                      </span>
                      <span className="ml-2 text-xs text-ink-2">
                        {totals.changedCount}개 문항 수정됨
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={`${barTrackClass} mt-4`}>
                <div
                  className={barFillClass}
                  style={{ width: `${totals.final}%` }}
                />
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-ink">
                {report.summary}
              </p>
              <p className="mt-3 text-xs text-ink-3">
                점수는 참고용입니다. 합격 여부는 담당자가 정합니다.
              </p>
            </section>

            <p className={`${panelClass} px-4 py-3 text-sm leading-relaxed text-ink-2`}>
              이 점수는 <strong className="text-ink">판단을 돕는 자료</strong>일
              뿐입니다. 점수가 실제 답변과 맞지 않는다고 판단되면 아래에서 직접
              고치고, 그 이유를 메모로 남겨 주세요.
            </p>

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

            <section id="transcript" className="scroll-mt-20">
              <TranscriptView transcript={report.transcript} />
            </section>
          </div>

          {/* 오른쪽 — 검토 */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[4.5rem]">
            <section className={`${cardClass} p-4`}>
              <p className={labelClass}>검토 현황</p>
              <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-2">AI 채점</dt>
                  <dd className="num text-base text-ink-3">{totals.ai}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-2">담당자 확인</dt>
                  <dd className="num text-base text-ink">{totals.final}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-2">고친 문항</dt>
                  <dd className="text-ink">
                    <span className="num">{totals.changedCount}</span> /{" "}
                    <span className="num">{report.questions.length}</span>
                  </dd>
                </div>
              </dl>

              <div className="my-4 h-px bg-line" />

              <label
                htmlFor="overall-memo"
                className={`${labelClass} block`}
              >
                전체 메모
              </label>
              <textarea
                id="overall-memo"
                rows={4}
                value={review.overallMemo}
                onChange={(event) =>
                  setReview((prev) => ({
                    ...prev,
                    overallMemo: event.target.value,
                  }))
                }
                placeholder="면접에서 확인하고 싶은 점을 적어 두세요."
                className={`mt-2 ${textareaClass}`}
              />

              <button
                type="button"
                onClick={handleSave}
                className={`${btnPrimary} mt-3 w-full`}
              >
                검토 내용 저장
              </button>
              <button type="button" className={`${btnSecondary} mt-2 w-full`}>
                대면 면접 대상으로 표시
              </button>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
                표시는 기록일 뿐 합격을 뜻하지 않습니다.
              </p>
            </section>

            <section className={`${panelClass} p-4`}>
              <p className={labelClass}>이 점수는 어떻게 나왔나요</p>
              <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                {report.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="truncate text-ink-2">문항 {index + 1}</dt>
                    <dd className="num shrink-0 text-ink">
                      {percents[question.id] ?? 0}%
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2">
                비중은 공고를 만들 때 담당자가 직접 정합니다. AI 가 바꾸지
                않습니다.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {toast ? (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm text-white shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
