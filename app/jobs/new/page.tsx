import Link from "next/link";
import RubricBuilder from "@/components/rubric/RubricBuilder";
import StaffShell from "@/components/ui/StaffShell";
import { requireStaff } from "@/lib/auth/staff";
import { hireIdOk } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import { createEmptyJob } from "@/lib/rubric";
import { INTERVIEW_TTL_DAYS, hirePosition, jobForHirePosition } from "@/lib/store";

export const metadata = {
  title: "새 공고 · Screen",
};

export const dynamic = "force-dynamic";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ hire?: string }>;
}) {
  const staff = await requireStaff();
  const { hire } = await searchParams;

  // Hire 공고에서 넘어왔으면 제목·직무 설명을 채워 두고, 저장할 때 그 공고 id 를 같이 적는다.
  const pid = hireIdOk(hire) && isStoreConfigured() ? hire : undefined;
  const [position, existing] = pid
    ? await Promise.all([hirePosition(pid), jobForHirePosition(pid)])
    : [null, null];
  const job = createEmptyJob();
  if (position) {
    job.title = position.title;
    job.description = position.jd;
  }

  const hireLine = position ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-4 text-[13px] text-ink-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-st-ok" />
        <span className="min-w-0">
          Hire 공고 <strong className="font-semibold text-ink">{position.title}</strong> 에 연결
          {position.dept ? ` · ${position.dept}` : ""}
          {position.candidates !== null ? <span className="num"> · 후보자 {position.candidates}</span> : null}
        </span>
      </span>
      {existing ? (
        <Link href={`/jobs/${existing.id}/candidates`} className="text-ink-3 underline underline-offset-2 hover:text-ink">
          기존 질문 묶음 · 저장하면 새 것으로 보냄
        </Link>
      ) : null}
      <Link href="/jobs/new" className="ml-auto text-ink-3 hover:text-ink">
        연결 빼기
      </Link>
    </div>
  ) : pid ? (
    <div className="flex items-center gap-2 border-b border-line pb-4 text-[13px] text-ink-3">
      <span className="h-[7px] w-[7px] rounded-full bg-st-off" />
      Hire 공고를 찾지 못했습니다 · 연결 없이 만듦
    </div>
  ) : null;

  return (
    <StaffShell current="jobs" who={staff.name}>
      <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
        <nav className="text-[13px] text-ink-3">
          <Link href="/dashboard" className="hover:text-ink">
            공고
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink">새 공고</span>
        </nav>
        <h1 className="mt-3 text-xl font-bold text-ink">새 공고</h1>

        <div className="mt-6">
          <RubricBuilder
            initialJob={job}
            hirePositionId={position ? position.id : undefined}
            hireTitle={position?.title}
            hireLine={hireLine}
            linkDays={INTERVIEW_TTL_DAYS}
          />
        </div>
      </main>
    </StaffShell>
  );
}
