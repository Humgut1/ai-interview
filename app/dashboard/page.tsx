import Link from "next/link";
import { after } from "next/server";
import StaffShell from "@/components/ui/StaffShell";
import JobsTable from "@/components/jobs/JobsTable";
import { btnPrimary } from "@/components/ui/styles";
import { countStages, hireBase } from "@/lib/candidates";
import { StoreMissing } from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { listJobs, purgeExpired, sttSweep } from "@/lib/store";
import { requireStaff } from "@/lib/auth/staff";

export const metadata = {
  title: "공고 · Screen",
};

export const dynamic = "force-dynamic";

/** 담당자 첫 화면 = 공고 목록. 공고 → 후보자 → 면접 확인 순서로 들어간다. */
export default async function DashboardPage() {
  const staff = await requireStaff();
  if (!isStoreConfigured()) return <StoreMissing />;

  // 보관 기간이 지난 기록은 대시보드를 열 때도 지운다(매일 도는 일이 빠져도 늦지 않게).
  try {
    await purgeExpired();
  } catch {}
  // 받아 적기가 밀린 답변도 이때 보낸다(화면은 기다리지 않는다)
  after(() => sttSweep().catch(() => {}));

  const rows = (await listJobs()).map(({ job, candidates }) => ({
    job,
    counts: countStages(candidates),
  }));
  const waiting = rows.reduce((sum, row) => sum + row.counts.검토대기, 0);

  return (
    <StaffShell current="jobs" who={staff.name}>
      <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-20 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink">공고</h1>
          {waiting > 0 ? (
            <span className="text-[13px] text-ink-2">
              검토 대기 <span className="num font-semibold text-ink">{waiting}</span>명
            </span>
          ) : null}
          <Link href="/jobs/new" className={`${btnPrimary} ml-auto`}>
            새 공고 만들기
          </Link>
        </div>
        <JobsTable rows={rows} hireUrl={hireBase()} />
      </main>
    </StaffShell>
  );
}
