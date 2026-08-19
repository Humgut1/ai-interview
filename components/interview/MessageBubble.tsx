import { formatTime } from "@/lib/interview";
import type { ChatMessage } from "@/lib/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isAi = message.role === "ai";

  return (
    <div className={`flex gap-2.5 ${isAi ? "" : "flex-row-reverse"}`}>
      {isAi ? (
        <span
          aria-hidden
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
        >
          AI
        </span>
      ) : null}

      <div className={`flex max-w-[80%] flex-col gap-1 ${isAi ? "" : "items-end"}`}>
        {message.kind === "followUp" ? (
          <span className="text-xs font-medium text-blue-700">추가 질문</span>
        ) : null}
        <div
          className={[
            "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAi
              ? "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
              : "rounded-tr-sm bg-blue-600 text-white",
          ].join(" ")}
        >
          {message.text}
        </div>
        <time
          dateTime={message.at}
          className="px-1 text-[11px] text-slate-400"
          suppressHydrationWarning
        >
          {formatTime(message.at)}
        </time>
      </div>
    </div>
  );
}
