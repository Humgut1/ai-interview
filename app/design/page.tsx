import DesignGallery from "@/components/design/DesignGallery";
import { getCandidateRows, getReportById } from "@/lib/mock/report";

export const metadata = {
  title: "디자인 시안",
};

/**
 * 결과 리뷰 화면의 디자인 방향 세 가지를 나란히 보여주는 화면.
 * 데이터는 실제 리포트 화면과 같은 mock 을 그대로 쓴다.
 */
export default function DesignPage() {
  return (
    <DesignGallery
      report={getReportById("demo-report")}
      candidates={getCandidateRows()}
    />
  );
}
