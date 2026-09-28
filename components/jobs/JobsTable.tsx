"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { md } from "@/lib/candidates";
import type { StageCounts } from "@/lib/candidates";
import type { JobSummary } from "@/lib/types";

type Row = { job: JobSummary; counts: StageCounts };
type Tab = "진행중" | "마감" | "전체";

const TABS: { key: Tab; label: string }[] = [
  { key: "진행중", label: "진행 중" },
  { key: "마감", label: "마감" },
  { key: "전체", label: "전체" },
];

const COLS = "grid-cols-[minmax(220px,1fr)_88px_64px_56px_56px_76px_84px_64px]";

/** D1 공고 목록 — 탭(진행 중·마감·전체) + 검색 + 한 줄에 한 공고 */
export default function JobsTable({ rows, hireUrl }: { rows: Row[]; hireUrl: string }) {
  const [tab, setTab] = useState<Tab>("진행중");
  const [q, setQ] = useState("");

  const count = (t: Tab) => (t === "전체" ? rows.length : rows.filter((r) => r.job.status === t).length);
  const shown = useMemo(() => {
    const word = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (tab === "전체" || r.job.status === tab) &&
        (!word || `${r.job.title} ${r.job.dept ?? ""}`.toLowerCase().includes(word))
    );
  }, [rows, tab, q]);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-line">
        <div role="tablist" className="flex gap-5">
          {TABS.map((t) => {
            const on = t.key === tab;
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
                {t.label} <span className="num text-ink-3">{count(t.key)}</span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="공고·부서 검색"
          aria-label="공고 검색"
          className="mb-2 ml-auto h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 sm:w-60"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`grid ${COLS} items-center gap-3 border-b border-line px-2 py-2.5 text-xs text-ink-3`}>
            <span>공고</span>
            <span>상태</span>
            <span>방식</span>
            <span className="text-right">보냄</span>
            <span className="text-right">제출</span>
            <span className="text-right">검토 대기</span>
            <span className="text-right">최근 활동</span>
            <span className="text-right">Hire</span>
          </div>

          {shown.map(({ job, counts }) => (
            <div
              key={job.id}
              className={`relative grid ${COLS} items-center gap-3 border-b border-line px-2 py-3.5 hover:bg-canvas`}
            >
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.id}/candidates`}
                  className="block truncate text-[15px] font-semibold text-ink after:absolute after:inset-0"
                >
                  {job.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {job.dept ?? "부서 없음"} · 질문 {job.questionCount}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 text-[13px] ${
                  job.status === "진행중" ? "text-st-run-ink" : "text-ink-3"
                }`}
              >
                <span
                  className={`h-[7px] w-[7px] rounded-full ${job.status === "진행중" ? "bg-st-run" : "bg-st-off"}`}
                />
                {job.status === "진행중" ? "진행 중" : "마감"}
              </span>
              <span className="text-[13px] text-ink-2">{job.mode === "video" ? "영상" : "글"}</span>
              <span className="num text-right text-sm text-ink-2">{counts.sent}</span>
              <span className="num text-right text-sm text-ink-2">{counts.submitted}</span>
              <span
                className={`num text-right text-sm ${counts.검토대기 ? "font-bold text-ink" : "text-ink-3"}`}
              >
                {counts.검토대기}
              </span>
              <span className="num text-right text-[13px] text-ink-2">{md(job.lastActivityAt)}</span>
              <span className="text-right">
                {job.hirePositionId ? (
                  <a
                    href={`${hireUrl}/p/${job.hirePositionId}/board`}
                    target="_blank"
                    rel="noreferrer"
                    className="relative z-[1] text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink"
                  >
                    연결됨
                  </a>
                ) : (
                  <span className="text-[13px] text-ink-3">없음</span>
                )}
              </span>
            </div>
          ))}

          {shown.length === 0 ? (
            <p className="px-2 py-12 text-center text-sm text-ink-3">
              {rows.length === 0 ? "아직 만든 공고가 없습니다." : "맞는 공고가 없습니다."}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
