"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardClass,
  labelClass,
  panelClass,
} from "@/components/ui/styles";
import {
  STAGE_FILTERS,
  countStages,
  filterByStage,
  interviewUrl,
} from "@/lib/candidates";
import { issueLinkAction } from "@/app/actions";
import type { Candidate, CandidateStage, JobSummary } from "@/lib/types";

/** 단계 이름을 화면에 쓰는 말로 바꾼다. 색으로 구분하지 않고 글자로만 알려 준다. */
const STAGE_LABEL: Record<CandidateStage, string> = {
  링크발급: "링크 발급",
  진행중: "진행 중",
  제출완료: "제출 완료",
};

/** "2026-08-19T09:41:00+09:00" → "08/19 09:41" */
function stamp(iso: string) {
  return `${iso.slice(5, 10).replace("-", "/")} ${iso.slice(11, 16)}`;
}

export default function CandidateManager({
  job,
  initialCandidates,
  who,
}: {
  job: JobSummary;
  initialCandidates: Candidate[];
  who?: string;
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [stage, setStage] = useState<"전체" | CandidateStage>("전체");
  const [toast, setToast] = useState<string | null>(null);
  /** 복사가 막혔을 때 링크를 그대로 보여 줄 후보자 */
  const [revealed, setRevealed] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const counts = useMemo(() => countStages(candidates), [candidates]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const shown = filterByStage(candidates, stage);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  async function handleInvite() {
    if (issuing) return;
    setIssuing(true);
    // 링크 값·라벨·만료 기한은 서버가 정한다.
    const result = await issueLinkAction(job.id);
    setIssuing(false);
    if (!result.ok) {
      notify("링크를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }
    setCandidates((prev) => [...prev, result.candidate]);
    notify(`${result.candidate.label}의 면접 링크를 만들었습니다.`);
  }

  async function handleCopy(candidate: Candidate) {
    const url = interviewUrl(candidate.token, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      notify(`${candidate.label}의 링크를 복사했습니다.`);
    } catch {
      // 브라우저가 복사를 막는 경우가 있다. 그때는 링크를 화면에 펼쳐 직접 복사하게 한다.
      setRevealed(candidate.id);
      notify("복사가 막혀 있어 링크를 아래에 펼쳤습니다.");
    }
  }

  return (
    <div className="min-h-dvh">
      <TopBar
        who={who}
        current="후보자 관리"
        right={
          <button
            type="button"
            onClick={handleInvite}
            disabled={issuing}
            className={`${btnPrimary} px-3 py-1.5`}
          >
            {issuing ? "만드는 중" : "면접 링크 발급"}
          </button>
        }
      />

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-24 lg:px-6">
        <div className="py-6">
          <p className="text-[13px] text-ink-3">
            <Link href="/dashboard" className="hover:text-ink">
              대시보드
            </Link>
            &nbsp;&rsaquo;&nbsp; 후보자 관리
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {job.title}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            질문 {job.questionCount}문항 &nbsp;·&nbsp; 후보자 {counts.total}명
            &nbsp;·&nbsp; 검토 대기{" "}
            <span className="num">{counts.검토대기}</span>명
          </p>
        </div>

        <div className={`${cardClass} flex flex-wrap items-center gap-2 px-4 py-3`}>
          {STAGE_FILTERS.map((filter) => {
            const count =
              filter.key === "전체" ? counts.total : counts[filter.key];
            const active = stage === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStage(filter.key)}
                aria-pressed={active}
                className={`rounded-md border px-3 py-1.5 text-[13px] transition ${
                  active
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-line-strong bg-surface text-ink-2 hover:bg-canvas"
                }`}
              >
                {filter.label}
                <span className="num ml-1.5 text-xs text-ink-3">{count}</span>
              </button>
            );
          })}
          <p className="ml-auto text-xs text-ink-3">지원한 순서로 놓여 있습니다</p>
        </div>

        <ul className={`${cardClass} mt-3 divide-y divide-line`}>
          {shown.map((candidate) => (
            <li
              key={candidate.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
            >
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">
                    {candidate.label}
                  </span>
                  <span className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                    {STAGE_LABEL[candidate.stage]}
                  </span>
                  {candidate.reviewStatus ? (
                    <span className="rounded-full bg-mute px-2 py-0.5 text-[11px] text-ink-3">
                      {candidate.reviewStatus}
                    </span>
                  ) : null}
                </div>
                <p className="num mt-1 text-xs text-ink-3" suppressHydrationWarning>
                  링크 발급 {stamp(candidate.invitedAt)}
                  {candidate.completedAt
                    ? ` · 제출 ${stamp(candidate.completedAt)}`
                    : ""}
                </p>
                {revealed === candidate.id ? (
                  <p className={`${panelClass} num mt-2 break-all px-3 py-2 text-xs text-ink`}>
                    {interviewUrl(candidate.token, origin)}
                  </p>
                ) : null}
              </div>

              <div className="w-16 text-right">
                {candidate.stage === "제출완료" &&
                (candidate.finalScore ?? candidate.aiScore) == null ? (
                  <p className="text-xs text-ink-3">채점 대기</p>
                ) : candidate.stage === "제출완료" ? (
                  <>
                    <p className={labelClass}>점수</p>
                    <p className="num mt-0.5 text-lg text-ink">
                      {candidate.finalScore ?? candidate.aiScore}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink-3">아직 없음</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(candidate)}
                  className={`${btnGhost} px-3 py-1.5`}
                >
                  링크 복사
                </button>
                {candidate.reportId ? (
                  <Link
                    href={`/interviews/${candidate.reportId}`}
                    className={`${btnSecondary} px-3 py-1.5`}
                  >
                    결과 보기
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-[13px] text-ink-3">
                    결과 없음
                  </span>
                )}
              </div>
            </li>
          ))}

          {shown.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-ink-3">
              이 단계에 있는 후보자가 없습니다.
            </li>
          ) : null}
        </ul>

        <p className={`${panelClass} mt-3 px-4 py-3 text-xs leading-relaxed text-ink-2`}>
          링크를 받은 사람은 누구나 면접에 들어갈 수 있으니, 지원자 본인에게만
          보내 주세요. 이 화면에서는 실명 대신 익명 라벨만 다룹니다. 목록은
          점수순으로 정렬하지 않습니다.
        </p>
      </main>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm text-surface shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
