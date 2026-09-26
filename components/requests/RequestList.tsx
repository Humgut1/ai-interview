"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { btnSecondary, cardClass, labelClass } from "@/components/ui/styles";
import { handleRequestAction } from "@/app/actions";
import { DELETE_REQUEST_DAYS, REQUEST_LABEL, type RequestRow } from "@/lib/requests";

/** "2026-09-26T14:05:00+09:00" → "9/26 14:05" */
function at(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)} ${iso.slice(11, 16)}`;
}

/** 삭제 요청은 10일 안에 처리해야 한다 — 남은 날. */
function daysLeft(iso: string) {
  const left = DELETE_REQUEST_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  return Math.max(left, 0);
}

export default function RequestList({ initial }: { initial: RequestRow[] }) {
  const [rows, setRows] = useState(initial);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const busy = useRef(false);

  async function act(row: RequestRow, action: "done" | "delete") {
    if (busy.current) return;
    busy.current = true;
    setFailure(null);
    try {
      const reply = await handleRequestAction(row.id, action);
      if (!reply.ok) {
        setFailure("처리하지 못했습니다. 화면을 새로 불러와 다시 해 주세요.");
        return;
      }
      setConfirm(null);
      const now = new Date().toISOString();
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
      setFailure("처리하지 못했습니다. 화면을 새로 불러와 다시 해 주세요.");
    } finally {
      busy.current = false;
    }
  }

  const open = rows.filter((r) => r.status === "open");
  const done = rows.filter((r) => r.status === "done").slice(0, 30);

  return (
    <>
      {failure ? (
        <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">{failure}</p>
      ) : null}

      <section className="mt-2">
        <h2 className="text-sm font-semibold text-ink">
          처리할 요청 <span className="num text-ink-2">{open.length}</span>
        </h2>
        {open.length === 0 ? (
          <p className={`${cardClass} mt-3 px-5 py-6 text-sm text-ink-2`}>처리할 요청이 없습니다.</p>
        ) : (
          <ul className={`${cardClass} mt-3 divide-y divide-line`}>
            {open.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {REQUEST_LABEL[row.kind]}
                  </span>
                  <span className="text-sm font-semibold text-ink">{row.label || "후보자"}</span>
                  <span className="min-w-0 truncate text-sm text-ink-2">{row.jobTitle}</span>
                  <span className="num ml-auto text-xs text-ink-3">{at(row.createdAt)}</span>
                </div>
                {row.note ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{row.note}</p>
                ) : null}
                {row.kind === "delete" ? (
                  <p className="text-xs text-ink-3">
                    {daysLeft(row.createdAt)}일 안에 처리하지 않으면 자동으로 지웁니다.
                  </p>
                ) : null}
                {row.kind === "human" ? (
                  <p className="text-xs text-ink-3">
                    Hire 에서 이 후보자의 면접을 담당자 면접으로 잡은 뒤 [처리 완료]를 누르세요.
                  </p>
                ) : null}
                {confirm === row.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink">답변·점수·검토 기록을 지웁니다. 되돌릴 수 없습니다.</span>
                    <button type="button" onClick={() => act(row, "delete")} className={`${btnSecondary} border-ink`}>
                      지우기
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="px-2 text-sm text-ink-3 hover:text-ink">
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {row.kind !== "delete" || row.purged ? (
                      <button type="button" onClick={() => act(row, "done")} className={btnSecondary}>
                        처리 완료
                      </button>
                    ) : null}
                    {!row.purged ? (
                      <button type="button" onClick={() => setConfirm(row.id)} className={btnSecondary}>
                        {row.kind === "delete" ? "지금 삭제" : "기록 삭제"}
                      </button>
                    ) : null}
                    {row.submitted && !row.purged ? (
                      <Link
                        href={`/interviews/${row.interviewId}`}
                        className="self-center px-2 text-sm text-ink-2 underline underline-offset-2 hover:text-ink"
                      >
                        리포트 보기
                      </Link>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section className="mt-10">
          <h2 className={labelClass}>최근 처리</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th className="py-2 pr-4 font-normal">요청</th>
                  <th className="py-2 pr-4 font-normal">후보자</th>
                  <th className="py-2 pr-4 font-normal">받은 때</th>
                  <th className="py-2 pr-4 font-normal">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {done.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4 text-ink-2">{REQUEST_LABEL[row.kind]}</td>
                    <td className="py-2 pr-4 text-ink">{row.label || "후보자"}</td>
                    <td className="num py-2 pr-4 text-ink-3">{at(row.createdAt)}</td>
                    <td className="py-2 pr-4 text-ink-3">
                      {row.handledAt ? at(row.handledAt) : ""} {row.handledBy ?? ""}
                      {row.purged ? " · 삭제됨" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
