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
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-900">
        전체 대화 보기 ({transcript.length}개 발언)
      </summary>

      <ol className="flex flex-col gap-4 border-t border-slate-100 px-5 py-5">
        {transcript.map((message) => (
          <li key={message.id} className="flex gap-3">
            <span
              className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                message.role === "ai"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {message.role === "ai" ? "AI" : "후보자"}
            </span>

            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">
                {KIND_LABEL[message.kind]} · {clockOf(message.at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {message.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
