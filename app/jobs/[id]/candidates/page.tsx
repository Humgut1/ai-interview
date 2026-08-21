import CandidateManager from "@/components/candidates/CandidateManager";
import { getCandidates, getJobSummary } from "@/lib/mock/dashboard";

export const metadata = {
  title: "후보자 관리 · AI 면접",
};

/**
 * 공고 하나에 딸린 후보자 목록.
 * API 연결 단계에서 Supabase 조회 + 로그인 확인을 붙인다.
 */
export default async function CandidatesPage({
  params,
}: PageProps<"/jobs/[id]/candidates">) {
  const { id } = await params;

  return (
    <CandidateManager
      job={getJobSummary(id)}
      initialCandidates={getCandidates(id)}
    />
  );
}
