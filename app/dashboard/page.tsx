import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import { btnPrimary, cardClass, labelClass, panelClass } from "@/components/ui/styles";
import { countStages } from "@/lib/candidates";
import { StoreMissing } from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { listJobs } from "@/lib/store";
import { requireStaff } from "@/lib/auth/staff";

export const metadata = {
  title: "대시보드 · AI 면접",
};

export const dynamic = "force-dynamic";

/** "2026-08-19T09:41:00+09:00" → "8월 19일" */
function shortDate(iso: string) {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

/**
 * 담당자가 로그인하면 제일 먼저 보는 화면.
 * "지금 내가 뭘 해야 하는지"를 위에, 공고 목록을 아래에 둔다.
 */
export default async function DashboardPage() {
  const staff = await requireStaff();
  if (!isStoreConfigured()) return <StoreMissing />;

  const rows = (await listJobs()).map(({ job, candidates }) => ({
    job,
    counts: countStages(candidates),
  }));

  const openJobs = rows.filter(({ job }) => job.status === "진행중").length;
  const waiting = rows.reduce((sum, row) => sum + row.counts.검토대기, 0);
  const running = rows.reduce((sum, row) => sum + row.counts.진행중, 0);

  return (
    <div className="min-h-dvh">
      <TopBar current="대시보드" who={staff.name} />

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 py-6">
          <div>
            <p className={labelClass}>담당자 화면</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
              대시보드
            </h1>
            <p className="mt-1 text-[13px] text-ink-2">
              먼저 볼 사람부터 알려 드립니다. 합격 여부는 담당자가 정합니다.
            </p>
          </div>
          <Link href="/jobs/new" className={btnPrimary}>
            새 직무 만들기
          </Link>
        </div>

        <p className="text-[13px] text-ink-2">
          검토 대기 <span className="num text-ink">{waiting}</span>명 &nbsp;·&nbsp; 진행 중 면접{" "}
          <span className="num text-ink">{running}</span>명 &nbsp;·&nbsp; 진행 중 공고{" "}
          <span className="num text-ink">{openJobs}</span>개
        </p>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">채용 공고</h2>
            <p className="text-xs text-ink-3">최근 만든 순서</p>
          </div>

          {rows.length === 0 ? (
            <p className={`${cardClass} mt-3 px-5 py-6 text-sm text-ink-2`}>
              아직 만든 공고가 없습니다. [새 직무 만들기]로 질문과 평가 기준을 먼저 정하세요.
            </p>
          ) : null}

          <ul className={`${cardClass} mt-3 divide-y divide-line empty:hidden`}>
            {rows.map(({ job, counts }) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}/candidates`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-canvas"
                >
                  <div className="min-w-[220px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">
                        {job.title}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          job.status === "진행중"
                            ? "border-line-strong bg-surface text-ink-2"
                            : "border-line bg-mute text-ink-3"
                        }`}
                      >
                        {job.status === "진행중" ? "진행 중" : "마감"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-3">
                      질문 {job.questionCount}문항 &nbsp;·&nbsp; 최근 활동{" "}
                      {shortDate(job.lastActivityAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={labelClass}>후보자</p>
                      <p className="num mt-0.5 text-lg text-ink">
                        {counts.total}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={labelClass}>검토 대기</p>
                      <p
                        className={`num mt-0.5 text-lg ${
                          counts.검토대기 > 0 ? "text-ink" : "text-ink-3"
                        }`}
                      >
                        {counts.검토대기}
                      </p>
                    </div>
                    <span aria-hidden className="text-ink-3">
                      &rsaquo;
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className={`${panelClass} mt-3 px-4 py-3 text-xs leading-relaxed text-ink-2`}>
            검토 대기는 &quot;답변은 다 냈는데 아직 아무도 열어 보지 않은
            사람&quot;입니다. 점수가 높은 순서가 아니라, 기다린 순서대로
            보시면 됩니다.
          </p>
        </section>
      </main>
    </div>
  );
}
