import ReviewPlayer from "@/components/review/ReviewPlayer";
import StaffShell from "@/components/ui/StaffShell";
import Notice, { StoreMissing } from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { after } from "next/server";
import { getReport, isSttReady, sttSweep } from "@/lib/store";
import { hireBase } from "@/lib/candidates";
import { requireStaff } from "@/lib/auth/staff";

export const metadata = {
  title: "면접 확인 · Screen",
};

export const dynamic = "force-dynamic";

/** 담당자용 면접 확인. 제출을 마친 면접만 열린다. 후보자는 이 화면을 볼 수 없다. */
export default async function InterviewReportPage({
  params,
}: PageProps<"/interviews/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!isStoreConfigured()) return <StoreMissing />;

  const bundle = await getReport(id);
  // 받아 적기 대기 중인 답변이 있으면 화면을 돌려준 뒤 보낸다/확인한다. 화면은 스스로 새로고침해 결과를 받는다.
  if (bundle?.report.transcript.some((m) => m.stt === "pending")) {
    after(() => sttSweep({ interviewId: id }).catch(() => {}));
  }
  if (!bundle) {
    return (
      <Notice
        label="면접"
        title="볼 수 있는 면접이 없습니다"
        body="아직 제출하지 않은 면접이거나 없는 주소입니다."
        home
      />
    );
  }

  return (
    <StaffShell current="jobs" who={staff.name} rail>
      <ReviewPlayer
        report={bundle.report}
        candidates={bundle.candidates}
        initialReview={bundle.review}
        initialStatus={bundle.status}
        requests={bundle.requests}
        sttReady={isSttReady()}
        hireUrl={hireBase()}
      />
    </StaffShell>
  );
}
