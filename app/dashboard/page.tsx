import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import { btnPrimary, cardClass, labelClass, panelClass } from "@/components/ui/styles";
import { countStages } from "@/lib/candidates";
import { getCandidates, getJobSummaries } from "@/lib/mock/dashboard";

export const metadata = {
  title: "대시보드 · AI 면접",
};

/** "2026-08-19T09:41:00+09:00" → "8월 19일" */
function shortDate(iso: string) {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

/**
 * 담당자가 로그인하면 제일 먼저 보는 화면.
 * "지금 내가 뭘 해야 하는지"를 위에, 공고 목록을 아래에 둔다.
 */
export default function DashboardPage() {
  const jobs = getJobSummaries();
  const rows = jobs.map((job) => ({
    job,
    counts: countStages(getCandidates(job.id)),
  }));

  const openJobs = jobs.filter((job) => job.status === "진행중").length;
  const waiting = rows.reduce((sum, row) => sum + row.counts.검토대기, 0);
  const running = rows.reduce((sum, row) => sum + row.counts.진행중, 0);
  const submitted = rows.reduce((sum, row) => sum + row.counts.제출완료, 0);

  const tiles = [
    { label: "검토 대기", value: waiting, hint: "지금 봐야 할 사람" },
    { label: "진행 중 면접", value: running, hint: "답변을 쓰는 중" },
    { label: "제출 완료", value: submitted, hint: "누적" },
    { label: "진행 중 공고", value: openJobs, hint: `전체 ${jobs.length}개` },
  ];

  return (
    <div className="min-h-dvh">
      <TopBar current="대시보드" />

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

        <dl className={`${cardClass} grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x`}>
          {tiles.map((tile, index) => (
            <div
              key={tile.label}
              className={`px-4 py-3.5 ${index < 2 ? "border-b border-line sm:border-b-0" : ""} ${
                index % 2 === 0 ? "border-r border-line sm:border-r-0" : ""
              }`}
            >
              <dt className={labelClass}>{tile.label}</dt>
              <dd className="num mt-1.5 text-2xl text-ink">
                {tile.value}
                <span className="ml-1 text-xs text-ink-3">
                  {tile.label === "진행 중 공고" ? "개" : "명"}
                </span>
              </dd>
              <p className="mt-0.5 text-xs text-ink-3">{tile.hint}</p>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">채용 공고</h2>
            <p className="text-xs text-ink-3">최근 만든 순서</p>
          </div>

          <ul className={`${cardClass} mt-3 divide-y divide-line`}>
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
