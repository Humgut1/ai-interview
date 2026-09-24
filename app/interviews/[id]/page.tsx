import ReportView from "@/components/review/ReportView";
import Notice, { StoreMissing } from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { getReport } from "@/lib/store";

export const metadata = {
  title: "면접 결과 리포트 · AI 면접",
};

export const dynamic = "force-dynamic";

/**
 * 담당자용 결과 리포트. 제출을 마친 면접만 열린다.
 * 로그인 확인은 SC4(TalentCore 계정)에서 붙인다. 후보자는 이 화면을 볼 수 없다.
 */
export default async function InterviewReportPage({
  params,
}: PageProps<"/interviews/[id]">) {
  const { id } = await params;
  if (!isStoreConfigured()) return <StoreMissing />;

  const bundle = await getReport(id);
  if (!bundle) {
    return (
      <Notice
        label="리포트"
        title="볼 수 있는 리포트가 없습니다"
        body="아직 제출하지 않은 면접이거나 없는 주소입니다."
        home
      />
    );
  }

  return (
    <ReportView
      report={bundle.report}
      candidates={bundle.candidates}
      initialReview={bundle.review}
      initialStatus={bundle.status}
    />
  );
}
