import Link from "next/link";
import { labelClass } from "@/components/ui/styles";
import type { CandidateRow } from "@/lib/types";

// "2026-08-12" → "08/12". 좁은 목록이라 연도까지 쓰지 않는다.
const shortDate = (iso: string) => iso.slice(5, 10).replace("-", "/");

const STATUS_STYLE: Record<CandidateRow["status"], string> = {
  미검토: "text-ink-3",
  검토중: "text-accent",
  검토완료: "text-ink-2",
};

/**
 * 왼쪽에 붙는 후보자 목록.
 * 점수 순 정렬은 일부러 하지 않는다. 줄을 세우는 순간 AI 점수가 합불처럼 읽힌다.
 */
export default function CandidateList({
  rows,
  currentReportId,
}: {
  rows: CandidateRow[];
  currentReportId: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between px-3 pb-2">
        <p className={labelClass}>지원자 {rows.length}명</p>
        <span className="text-[11px] text-ink-3">지원 순서</span>
      </div>

      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const current = row.reportId === currentReportId;
          const shown = row.finalScore ?? row.aiScore;

          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-sm ${
                    current ? "font-semibold text-ink" : "text-ink"
                  }`}
                >
                  {row.candidateLabel}
                </span>
                <span className="num shrink-0 text-sm text-ink-2">{shown ?? "대기"}</span>
              </div>
              <p className={`mt-0.5 text-[11px] ${STATUS_STYLE[row.status]}`}>
                {row.status} · {shortDate(row.completedAt)}
              </p>
            </>
          );

          return (
            <li key={row.reportId}>
              {current ? (
                <div
                  aria-current="page"
                  className="rounded-md bg-accent-soft px-3 py-2.5"
                >
                  {inner}
                </div>
              ) : (
                <Link
                  href={`/interviews/${row.reportId}`}
                  className="block rounded-md px-3 py-2.5 hover:bg-mute"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 rounded-md bg-sand px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
        지원한 순서로 놓여 있습니다. 점수가 높은 사람이 위로 올라오지 않습니다.
      </p>
    </div>
  );
}
