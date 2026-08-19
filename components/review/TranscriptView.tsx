import { clockOf } from "@/lib/review";
import type { ChatMessage } from "@/lib/types";

const KIND_LABEL: Record<ChatMessage["kind"], string> = {
  intro: "안내",
  question: "질문",
  followUp: "후속 질문",
  answer: "답변",
  closing: "마무리",
};

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
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {message.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
