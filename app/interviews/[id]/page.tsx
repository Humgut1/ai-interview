import ReportView from "@/components/review/ReportView";
import { getCandidateRows, getReportById } from "@/lib/mock/report";

export const metadata = {
  title: "면접 결과 리포트 · AI 면접",
};

/**
 * 담당자용 결과 리포트.
 * API 연결 단계에서 Supabase 조회 + 로그인 확인을 붙인다. 후보자는 이 화면을 볼 수 없다.
 */
export default async function InterviewReportPage({
  params,
}: PageProps<"/interviews/[id]">) {
  const { id } = await params;
  const report = getReportById(id);

  return <ReportView report={report} candidates={getCandidateRows()} />;
}
