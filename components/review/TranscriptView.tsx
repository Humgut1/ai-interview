import { clockOf } from "@/lib/review";
import type { ChatMessage } from "@/lib/types";

const KIND_LABEL: Record<ChatMessage["kind"], string> = {
  intro: "안내",
  question: "질문",
  followUp: "후속 질문",
  answer: "답변",
  closing: "마무리",
};

const STT_LABEL = { pending: "받아 적기 대기", done: "받아 적음", failed: "받아 적기 실패" } as const;

function clock(total: number) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 영상 답변 한 줄 — 길이 · 받아 적기 상태 · 몇 번째 녹화 */
function mediaLine(message: ChatMessage) {
  if (!message.media) return null;
  const parts = [`영상 답변 ${clock(message.media.seconds)}`, STT_LABEL[message.stt ?? "pending"]];
  if (message.media.take > 1) parts.push(`${message.media.take}번째 녹화`);
  return parts.join(" · ");
}

/**
 * 면접에서 오간 대화 전문.
 * 점수만 보고 판단하지 않도록, 리포트에서 언제든 원문을 확인할 수 있어야 한다.
 */
export default function TranscriptView({
  transcript,
}: {
  transcript: ChatMessage[];
}) {
  return (
    <details className="rounded-md border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink">
        전체 대화 보기 ({transcript.length}개 발언)
      </summary>

      <ol className="flex flex-col gap-4 border-t border-line px-5 py-5">
        {transcript.map((message) => (
          <li key={message.id} className="flex gap-3">
            <span
              className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                message.role === "ai"
                  ? "bg-accent-soft text-accent"
                  : "bg-mute text-ink-2"
              }`}
            >
              {message.role === "ai" ? "AI" : "후보자"}
            </span>

            <div className="min-w-0">
              <p className="text-[11px] text-ink-3">
                {KIND_LABEL[message.kind]} · {clockOf(message.at)}
              </p>
              {message.media ? (
                <p className="mt-1 text-xs text-ink-2">{mediaLine(message)}</p>
              ) : null}
              {message.text ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {message.text}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
