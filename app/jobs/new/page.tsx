import Link from "next/link";
import RubricBuilder from "@/components/rubric/RubricBuilder";
import TopBar from "@/components/ui/TopBar";
import { panelClass } from "@/components/ui/styles";
import { requireStaff } from "@/lib/auth/staff";
import { hireIdOk } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import { createEmptyJob } from "@/lib/rubric";
import { hirePosition, jobForHirePosition } from "@/lib/store";

export const metadata = {
  title: "새 직무 만들기 · AI 면접",
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

  return (
    <div className="min-h-dvh">
      <TopBar current="새 직무" who={staff.name} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <nav className="text-sm text-ink-3">
          <Link href="/dashboard" className="hover:text-ink">
            대시보드
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink">새 직무</span>
        </nav>

        <header className="mt-4">
          <h1 className="text-2xl font-bold text-ink">
            직무와 평가 기준 만들기
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            여기서 만든 기준(rubric)대로만 AI 가 답변을 채점합니다. 점수와 근거를
            정리해 줄 뿐, 합격 여부는 사람이 정합니다.
          </p>
        </header>

        {position ? (
          <p className={`${panelClass} mt-6 px-4 py-3 text-sm leading-relaxed text-ink-2`}>
            Hire 공고 <strong className="text-ink">{position.title}</strong> 에 연결합니다.
            저장하면 Hire 후보자 상세에서 [AI 1차 면접 보내기]를 쓸 수 있습니다.
            {existing ? (
              <>
                {" "}이미 연결된 질문 묶음이 있습니다 —{" "}
                <Link
                  href={`/jobs/${existing.id}/candidates`}
                  className="text-ink underline underline-offset-2"
                >
                  {existing.title}
                </Link>
                . 새로 저장하면 앞으로는 새 묶음으로 보냅니다.
              </>
            ) : null}
          </p>
        ) : pid ? (
          <p className={`${panelClass} mt-6 px-4 py-3 text-sm text-ink-2`}>
            Hire 공고를 찾지 못했습니다. 연결 없이 만듭니다.
          </p>
        ) : null}

        <div className="mt-8">
          <RubricBuilder
            initialJob={job}
            hirePositionId={position ? position.id : undefined}
          />
        </div>
      </main>
    </div>
  );
}
