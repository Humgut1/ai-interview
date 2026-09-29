import EndPage, { kstShort } from "@/components/interview/EndPage";

/** C7b 지원을 그만둔 뒤. 같은 링크로 다시 들어와도 이 화면이다. */
export default function WithdrawnScreen({
  org,
  jobTitle,
  at,
  videos,
}: {
  org: string;
  jobTitle: string;
  at: string;
  videos: number;
}) {
  const when = kstShort(at);
  return (
    <EndPage
      org={org}
      kicker={`${jobTitle} · 1차 면접`}
      tone="off"
      title="지원을 그만두었습니다"
      facts={[
        <span key="del" className="num">
          {videos > 0 ? `답변 영상 ${videos}개와 받아 적은 글을 지웠습니다` : "올린 답변이 없어 지울 영상이 없었습니다"}
          {when ? ` · ${when}` : ""}
        </span>,
        "채용 담당자에게 알렸습니다",
        "다시 지원하려면 채용 사이트에서 새로 지원해 주세요",
      ]}
    >
      <p className="mt-7 text-[13px] text-ink-3">이 창은 닫아도 됩니다</p>
    </EndPage>
  );
}
