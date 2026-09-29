"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import {
  BUCKET_LOOK,
  CAND_FILTERS,
  bucketOf,
  countStages,
  filterCands,
  interviewUrl,
  md,
  mdhm,
  type CandFilter,
} from "@/lib/candidates";
import { issueLinkAction } from "@/app/actions";
import type { Candidate, JobSummary } from "@/lib/types";

const COLS = "grid-cols-[minmax(200px,1fr)_150px_110px_60px_96px_60px_150px]";

/** D3 공고 안 후보자 — 탭(상태별) + 검색 + 한 줄에 한 사람 */
export default function CandidateManager({
  job,
  initialCandidates,
  hireUrl,
}: {
  job: JobSummary;
  initialCandidates: Candidate[];
  hireUrl: string;
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [tab, setTab] = useState<CandFilter>("전체");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  /** 복사가 막혔거나 막 만든 링크를 펼쳐 보여 줄 후보자 */
  const [revealed, setRevealed] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const counts = useMemo(() => countStages(candidates), [candidates]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const shown = useMemo(() => {
    const word = q.trim().toLowerCase();
    return filterCands(candidates, tab).filter(
      (c) => !word || `${c.name ?? ""} ${c.email ?? ""} ${c.label}`.toLowerCase().includes(word)
    );
  }, [candidates, tab, q]);
  const tabs = CAND_FILTERS.filter((f) => f.key !== "면접요청" || counts.면접요청 > 0);

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
    setRevealed(result.candidate.id);
    notify(`${result.candidate.label} 면접 링크를 만들었습니다.`);
  }

  async function handleCopy(c: Candidate) {
    const url = interviewUrl(c.token, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      notify(`${c.name ?? c.label} 링크를 복사했습니다.`);
    } catch {
      // 브라우저가 복사를 막는 경우가 있다. 그때는 링크를 화면에 펼쳐 직접 복사하게 한다.
      setRevealed(c.id);
      notify("복사가 막혀 있어 링크를 펼쳤습니다.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-20 lg:px-8">
      <nav className="flex items-center gap-2 text-[13px]" aria-label="위치">
        <Link href="/dashboard" className="text-ink-3 hover:text-ink">
          공고
        </Link>
        <span className="text-line-strong">/</span>
        <span className="truncate font-semibold text-ink">{job.title}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{job.title}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {[
              job.dept,
              job.mode === "video" ? "영상 면접" : "글 면접",
              `질문 ${job.questionCount}`,
              job.status === "진행중" ? "진행 중" : "마감",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {job.hirePositionId ? (
            <a
              href={`${hireUrl}/p/${job.hirePositionId}/board`}
              target="_blank"
              rel="noreferrer"
              className={btnSecondary}
            >
              Hire 에서 보기
            </a>
          ) : null}
          <button type="button" onClick={handleInvite} disabled={issuing} className={btnPrimary}>
            {issuing ? "만드는 중" : "면접 링크 발급"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-line">
        <div role="tablist" className="flex flex-wrap gap-x-5">
          {tabs.map((t) => {
            const on = t.key === tab;
            const n = t.key === "전체" ? counts.total : counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 pb-2.5 text-sm ${
                  on ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {t.label}{" "}
                <span className={`num ${t.key === "검토대기" && n ? "font-semibold text-ink" : "text-ink-3"}`}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·메일 검색"
          aria-label="후보자 검색"
          className="mb-2 ml-auto h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 sm:w-60"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className={`grid ${COLS} items-center gap-3 border-b border-line px-2 py-2.5 text-xs text-ink-3`}>
            <span>후보자</span>
            <span>상태</span>
            <span>진행</span>
            <span className="text-right">보낸 날</span>
            <span className="text-right">마지막 활동</span>
            <span className="text-right">점수</span>
            <span />
          </div>

          {shown.map((c) => {
            const look = BUCKET_LOOK[bucketOf(c)];
            const pct = c.questionTotal ? Math.round((c.answered / c.questionTotal) * 100) : 0;
            const score = c.finalScore ?? c.aiScore;
            return (
              <div key={c.id} className="border-b border-line px-2 py-3 hover:bg-canvas">
                <div className={`grid ${COLS} items-center gap-3`}>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{c.name ?? c.label}</p>
                    <p className="truncate text-xs text-ink-3">
                      {c.email ?? (c.hireCandidateId ? "" : "Hire 연결 없음")}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-[13px] ${look.ink}`}>
                    <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${look.dot}`} />
                    {look.label}
                    {c.openRequests ? (
                      <Link
                        href="/requests"
                        className="ml-1 text-xs font-semibold text-st-bad underline underline-offset-2"
                      >
                        요청 {c.openRequests}
                      </Link>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-14 overflow-hidden rounded-full bg-mute">
                      <span
                        className={`block h-full rounded-full ${c.stage === "제출완료" ? "bg-ink-3" : "bg-st-run"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="num text-xs text-ink-2">
                      {c.answered}/{c.questionTotal}
                    </span>
                    {c.leaveCount ? (
                      <span className="num text-xs text-ink-3" title="잠시 나갔다 들어온 횟수">
                        나감 {c.leaveCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="num text-right text-[13px] text-ink-2">{md(c.invitedAt)}</span>
                  <span className="num text-right text-[13px] text-ink-2">{mdhm(c.lastActivityAt)}</span>
                  <span className="num text-right text-sm text-ink">
                    {c.stage === "제출완료" && !c.purged ? (
                      score ?? <span className="text-xs text-ink-3">채점 전</span>
                    ) : null}
                  </span>
                  <span className="flex justify-end gap-1.5">
                    {c.purged || c.optedOut || c.stage === "제출완료" || c.expired ? null : (
                      <button
                        type="button"
                        onClick={() => handleCopy(c)}
                        className="h-8 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink-2 hover:text-ink"
                      >
                        링크 복사
                      </button>
                    )}
                    {c.reportId ? (
                      <Link
                        href={`/interviews/${c.reportId}`}
                        className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-semibold text-surface hover:bg-accent-hover"
                      >
                        결과
                      </Link>
                    ) : null}
                  </span>
                </div>
                {revealed === c.id ? (
                  <p className="num mt-2 rounded-md border border-line bg-sand px-3 py-2 text-xs break-all text-ink">
                    {interviewUrl(c.token, origin)}
                  </p>
                ) : null}
              </div>
            );
          })}

          {shown.length === 0 ? (
            <p className="px-2 py-12 text-center text-sm text-ink-3">
              {candidates.length === 0
                ? job.hirePositionId
                  ? "보낸 면접 없음 · Hire 후보자 서랍의 [AI 면접 보내기]로 보냅니다"
                  : "보낸 면접 없음"
                : "이 탭에 있는 후보자 없음"}
            </p>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm text-surface shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
