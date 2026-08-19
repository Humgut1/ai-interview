import Link from "next/link";
import { dateOf, levelMeta, levelOf } from "@/lib/review";
import type { CandidateRow } from "@/lib/types";

const STATUS_STYLE: Record<CandidateRow["status"], string> = {
  미검토: "bg-slate-100 text-slate-600",
  검토중: "bg-amber-50 text-amber-700",
  검토완료: "bg-emerald-50 text-emerald-700",
};

/**
 * 같은 직무에 지원한 후보자 목록.
 * 점수 순 정렬은 일부러 하지 않는다. 줄을 세우는 순간 AI 점수가 합불처럼 읽힌다.
 */
export default function CandidateTable({
  rows,
  currentReportId,
}: {
  rows: CandidateRow[];
  currentReportId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="px-5 py-3 font-medium">후보자</th>
            <th className="px-5 py-3 font-medium">면접 완료</th>
            <th className="px-5 py-3 font-medium">AI 점수</th>
            <th className="px-5 py-3 font-medium">최종 점수</th>
            <th className="px-5 py-3 font-medium">검토 상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const current = row.reportId === currentReportId;
            const meta = levelMeta(levelOf(row.aiScore));

            return (
              <tr
                key={row.reportId}
                className={`border-b border-slate-50 last:border-0 ${
                  current ? "bg-blue-50/40" : ""
                }`}
              >
                <td className="px-5 py-3">
                  {current ? (
                    <span className="font-semibold text-slate-900">
                      {row.candidateLabel}
                      <span className="ml-2 text-xs font-normal text-blue-700">
                        지금 보는 리포트
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={`/interviews/${row.reportId}`}
                      className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-950"
                    >
                      {row.candidateLabel}
                    </Link>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {dateOf(row.completedAt)}
                </td>
                <td className="px-5 py-3">
                  <span className="tabular-nums text-slate-900">
                    {row.aiScore}
                  </span>
                  <span
                    className={`ml-2 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${meta.accent}`}
                  >
                    {meta.label}
                  </span>
                </td>
                <td className="px-5 py-3 tabular-nums text-slate-600">
                  {row.finalScore ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      STATUS_STYLE[row.status]
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
