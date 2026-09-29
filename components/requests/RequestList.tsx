"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { handleRequestAction } from "@/app/actions";
import { DELETE_REQUEST_DAYS, REQUEST_LABEL, type RequestKind, type RequestRow } from "@/lib/requests";

/** "2026-09-26T14:05:00+09:00" → "9/26 14:05" */
function at(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)} ${iso.slice(11, 16)}`;
}

function md(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 삭제 요청은 10일 안에 처리해야 한다 — 남은 날. */
function daysLeft(iso: string) {
  const left = DELETE_REQUEST_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  return Math.max(left, 0);
}

/** 자동 삭제 날짜 */
function dueDay(iso: string) {
  return md(new Date(new Date(iso).getTime() + DELETE_REQUEST_DAYS * 86400_000 + 9 * 3600_000).toISOString());
}

const DOT: Record<RequestKind, string> = {
  delete: "bg-st-bad",
  human: "bg-st-warn",
  explain: "bg-st-warn",
  withdraw: "bg-st-off",
};

const SHORT: Record<RequestKind, string> = {
  delete: "삭제 요청",
  human: "담당자 면접",
  explain: "결과 설명",
  withdraw: "지원 그만둠",
};

type Tab = "open" | RequestKind | "done";

export default function RequestList({ initial, hireUrl }: { initial: RequestRow[]; hireUrl: string }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>("open");
  const [picked, setPicked] = useState<string | null>(initial.find((r) => r.status === "open")?.id ?? null);
  const [confirm, setConfirm] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const busy = useRef(false);

  async function act(row: RequestRow, action: "done" | "delete") {
    if (busy.current) return;
    busy.current = true;
    setFailure(null);
    try {
      const reply = await handleRequestAction(row.id, action);
      if (!reply.ok) {
        setFailure("처리하지 못했습니다 · 새로 불러와 다시");
        return;
      }
      setConfirm(false);
      const now = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 19) + "+09:00";
      setRows((list) =>
        list.map((r) => {
          const same = r.interviewId === row.interviewId;
          const closes = r.id === row.id || (action === "delete" && same && r.kind === "delete");
          return {
            ...r,
            status: closes ? "done" : r.status,
            handledAt: closes ? now : r.handledAt,
            purged: r.purged || (action === "delete" && same),
          };
        })
      );
    } catch {
      setFailure("처리하지 못했습니다 · 새로 불러와 다시");
    } finally {
      busy.current = false;
    }
  }

  const open = rows.filter((r) => r.status === "open");
  const done = rows.filter((r) => r.status === "done");
  const shown =
    tab === "open" ? open : tab === "done" ? done.slice(0, 50) : open.filter((r) => r.kind === tab);
  const row = rows.find((r) => r.id === picked) ?? null;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "open", label: "처리할 것", count: open.length },
    { key: "delete", label: "삭제 요청" },
    { key: "human", label: "담당자 면접" },
    { key: "explain", label: "결과 설명" },
    { key: "withdraw", label: "지원 그만둠" },
    { key: "done", label: "처리함", count: done.length },
  ];

  function deadline(r: RequestRow) {
    if (r.status === "done") return <span className="text-ink-3">{r.handledAt ? at(r.handledAt) : ""}</span>;
    if (r.kind === "delete")
      return <span className="num font-semibold text-st-bad">남은 {daysLeft(r.createdAt)}일</span>;
    if (r.kind === "withdraw") return <span className="text-ink-3">영상 지워짐</span>;
    return <span className="text-ink-3">-</span>;
  }

  return (
    <>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={[
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px]",
              tab === t.key ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink",
            ].join(" ")}
          >
            {t.label}
            {t.count !== undefined ? <span className="num ml-1 text-ink-3">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {failure ? (
        <p role="alert" className="mt-3 text-sm text-st-bad">
          {failure}
        </p>
      ) : null}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-x-auto">
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">
              {tab === "done" ? "처리한 요청 없음" : "처리할 요청 없음"}
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th className="py-2 pr-3 font-normal">요청</th>
                  <th className="py-2 pr-3 font-normal">후보자</th>
                  <th className="py-2 pr-3 font-normal">공고</th>
                  <th className="py-2 pr-3 font-normal">받은 때</th>
                  <th className="py-2 font-normal">{tab === "done" ? "처리" : "기한"}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setPicked(r.id);
                      setConfirm(false);
                    }}
                    aria-selected={picked === r.id}
                    className={[
                      "cursor-pointer border-b border-line",
                      picked === r.id ? "bg-sand" : "hover:bg-canvas",
                    ].join(" ")}
                  >
                    <td className="py-2.5 pr-3">
                      <button type="button" className="flex items-center gap-2 whitespace-nowrap text-left text-ink">
                        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${DOT[r.kind]}`} />
                        {SHORT[r.kind]}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-ink">{r.name || "후보자"}</td>
                    <td className="max-w-[200px] truncate py-2.5 pr-3 text-ink-2">{r.jobTitle}</td>
                    <td className="num whitespace-nowrap py-2.5 pr-3 text-ink-3">{at(r.createdAt)}</td>
                    <td className="num whitespace-nowrap py-2.5">{deadline(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {row ? (
          <aside className="self-start rounded-lg border border-line bg-surface p-[18px] lg:sticky lg:top-6">
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className={`h-[7px] w-[7px] rounded-full ${DOT[row.kind]}`} />
              {REQUEST_LABEL[row.kind]}
              {row.status === "done" ? <span className="text-ink-3">· 처리함</span> : null}
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-ink">{row.name || "후보자"}</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {row.jobTitle} · AI 면접{row.submittedAt ? ` · 제출 ${md(row.submittedAt)}` : " · 미제출"}
            </p>

            {row.note ? (
              <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-sand px-3 py-2.5 text-[13px] leading-relaxed text-ink">
                {row.note}
              </p>
            ) : null}

            <dl className="mt-3 text-[13px]">
              {(
                [
                  ["받은 때", at(row.createdAt)],
                  row.kind === "delete" && row.status === "open"
                    ? ["자동 삭제", `${dueDay(row.createdAt)} · 남은 ${daysLeft(row.createdAt)}일`]
                    : null,
                  [
                    "지울 것",
                    row.purged ? "이미 지워짐" : "영상 · 받아 적은 글 · 점수 · 검토",
                  ],
                  row.status === "done" && row.handledAt
                    ? ["처리", `${at(row.handledAt)} ${row.handledBy ?? ""}`]
                    : null,
                  ["Hire", row.hireCandidateId ? "연결됨" : "연결 없음"],
                ].filter(Boolean) as [string, string][]
              ).map(([term, desc]) => (
                <div key={term} className="flex justify-between gap-3 border-t border-line py-2">
                  <dt className="shrink-0 text-ink-3">{term}</dt>
                  <dd className={`num text-right ${term === "자동 삭제" ? "text-st-bad" : "text-ink"}`}>{desc}</dd>
                </div>
              ))}
            </dl>

            {row.status === "open" ? (
              confirm ? (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-[13px] text-ink">답변·점수·검토 기록을 지웁니다 · 되돌릴 수 없음</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => act(row, "delete")} className={`${btnPrimary} flex-1`}>
                      지우기
                    </button>
                    <button type="button" onClick={() => setConfirm(false)} className={btnSecondary}>
                      취소
                    </button>
                  </div>
                </div>
              ) : row.kind === "delete" && !row.purged ? (
                <button type="button" onClick={() => setConfirm(true)} className={`${btnPrimary} mt-4 h-11 w-full`}>
                  지금 삭제
                </button>
              ) : (
                <button type="button" onClick={() => act(row, "done")} className={`${btnPrimary} mt-4 h-11 w-full`}>
                  처리 완료
                </button>
              )
            ) : null}

            <div className="mt-2 flex gap-2">
              {row.submitted && !row.purged ? (
                <Link href={`/interviews/${row.interviewId}`} className={`${btnSecondary} flex-1 text-center`}>
                  답변 보기
                </Link>
              ) : null}
              {row.hireCandidateId && row.hirePositionId ? (
                <a
                  href={`${hireUrl}/p/${row.hirePositionId}/board?c=${row.hireCandidateId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${btnSecondary} flex-1 text-center`}
                >
                  Hire 에서 보기
                </a>
              ) : null}
            </div>
            {row.status === "open" && row.kind !== "delete" && !row.purged && !confirm ? (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="mt-3 text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink"
              >
                기록 삭제
              </button>
            ) : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
