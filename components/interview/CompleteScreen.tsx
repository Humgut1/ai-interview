"use client";

import { clock } from "@/components/interview/ConsentScreen";
import EndPage from "@/components/interview/EndPage";
import RequestBox from "@/components/interview/RequestBox";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSession, InterviewSetup } from "@/lib/types";

/** C9 제출 완료 — 무엇이 어떻게 되는지 + 보낸 답 목록 + 요청(결과 설명·기록 삭제). */
export default function CompleteScreen({
  setup,
  session,
  rights,
  onRights,
  org,
}: {
  setup: InterviewSetup;
  session: InterviewSession;
  rights: CandidateRights;
  onRights: (rights: CandidateRights) => void;
  org: string;
}) {
  const video = setup.mode === "video";
  // 질문마다 보낸 답 — 첫 답 + 되묻기에 대한 답
  const rows = setup.questions.map((q, i) => {
    const answers = session.messages.filter((m) => m.role === "candidate" && m.questionId === q.id);
    const [main, ...more] = answers;
    const len = (sec?: number) => (sec ? clock(sec) : "보냄");
    const note = main
      ? [video ? len(main.media?.seconds) : "보냄", ...more.map((m) => `되묻기 ${video ? len(m.media?.seconds) : "보냄"}`)].join(" · ")
      : "답 없음";
    return { key: q.id, label: `질문 ${i + 1}`, note, sent: Boolean(main) };
  });

  return (
    <EndPage
      org={org}
      kicker={`${setup.jobTitle} · 1차 ${video ? "영상 " : ""}면접`}
      title="제출했습니다"
      facts={[
        "채용 담당자가 답변을 직접 보고 판단합니다",
        "결과는 지원할 때 적은 연락처로 알려 드립니다",
        <span key="keep" className="num">
          보낸 답은 바꿀 수 없습니다 · 보관 {rights.retentionDays}일 뒤 자동 삭제
        </span>,
      ]}
    >
      <ol className="mt-6 rounded-md border border-line bg-surface px-4">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0">
            <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${row.sent ? "bg-st-ok" : "bg-line-strong"}`} />
            <span className="num text-sm text-ink">{row.label}</span>
            <span className="num ml-auto text-[13px] text-ink-3">{row.note}</span>
          </li>
        ))}
      </ol>

      <RequestBox
        token={setup.token}
        rights={rights}
        kinds={["explain", "delete"]}
        onRights={onRights}
        title="요청하기"
      />

      <p className="mt-6 text-[13px] text-ink-3">이 창은 닫아도 됩니다 · 이 링크로 다시 들어오면 요청을 할 수 있습니다</p>
    </EndPage>
  );
}
