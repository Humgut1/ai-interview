import CandidateManager from "@/components/candidates/CandidateManager";
import Notice, { StoreMissing } from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { getJobSummary } from "@/lib/store";

export const metadata = {
  title: "후보자 관리 · AI 면접",
};

export const dynamic = "force-dynamic";

/** 공고 하나에 딸린 후보자 목록. 로그인 확인은 SC4 에서 붙인다. */
export default async function CandidatesPage({
  params,
}: PageProps<"/jobs/[id]/candidates">) {
  const { id } = await params;
  if (!isStoreConfigured()) return <StoreMissing />;

  const found = await getJobSummary(id);
  if (!found) {
    return (
      <Notice label="공고" title="공고를 찾을 수 없습니다" body="없는 주소이거나 지워진 공고입니다." home />
    );
  }

  return <CandidateManager job={found.job} initialCandidates={found.candidates} />;
}
