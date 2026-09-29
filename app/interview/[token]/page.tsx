import ChatWindow from "@/components/interview/ChatWindow";
import WithdrawnScreen from "@/components/interview/WithdrawnScreen";
import Notice from "@/components/ui/Notice";
import { isStoreConfigured } from "@/lib/db";
import { candidatePage } from "@/lib/store";

export const metadata = {
  title: "1차 면접 · AI 면접",
};

export const dynamic = "force-dynamic";

/** 마감 시각 — 한국 시간 "10/11(토) 23:59". */
function deadlineLabel(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")}(${get("weekday")}) ${get("hour")}:${get("minute")}`;
}

/**
 * 후보자용 화면. 로그인 없이 링크(토큰)만으로 들어온다.
 * 진행 기록은 서버에 있으므로 다른 기기에서 같은 링크를 열어도 이어서 한다.
 * 평가 기준은 서버에서만 읽고, 이 화면으로는 질문 문장과 후보자 권리(보관 기간·낸 요청)만 내려간다.
 */
export default async function InterviewPage({
  params,
}: PageProps<"/interview/[token]">) {
  const { token } = await params;
  if (!isStoreConfigured()) {
    return (
      <Notice
        label="준비 중"
        title="면접을 열 수 없습니다"
        body="잠시 뒤 다시 열어 주세요. 계속되면 채용 담당자에게 문의해 주세요."
      />
    );
  }

  const found = await candidatePage(token);
  const org = process.env.ORG_NAME ? `${process.env.ORG_NAME} 채용` : "채용 면접";
  if (found.state === "withdrawn") {
    return <WithdrawnScreen org={org} jobTitle={found.jobTitle} at={found.at} videos={found.videos} />;
  }
  if (found.state === "missing") {
    return (
      <Notice
        label="링크 확인"
        title="면접 링크를 찾을 수 없습니다"
        body="받은 메일의 링크를 그대로 열었는지 확인해 주세요. 계속되면 채용 담당자에게 문의해 주세요."
      />
    );
  }
  if (found.state === "purged") {
    return (
      <Notice
        label="기록 삭제"
        title="이 면접의 기록은 삭제되었습니다"
        body="보관 기간이 끝났거나 삭제 요청에 따라 답변과 평가 기록을 지웠습니다. 궁금한 점은 채용 담당자에게 문의해 주세요."
      />
    );
  }
  if (found.state === "expired") {
    return (
      <Notice
        label="기한 지남"
        title="면접 링크의 기한이 지났습니다"
        body="새 링크가 필요하면 채용 담당자에게 문의해 주세요."
      />
    );
  }

  return (
    <ChatWindow
      setup={found.setup}
      initialSession={found.session}
      initialRights={found.rights}
      org={org}
      deadline={deadlineLabel(found.expiresAt)}
    />
  );
}
