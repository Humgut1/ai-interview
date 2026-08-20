import { formatTime } from "@/lib/interview";
import { labelClass } from "@/components/ui/styles";
import type { ChatMessage } from "@/lib/types";

/** 말풍선 위에 붙는 작은 표시. 같은 흰 카드라도 무슨 말인지 구분되게 한다. */
const AI_LABEL: Partial<Record<ChatMessage["kind"], string>> = {
  intro: "안내",
  question: "질문",
  followUp: "추가 질문",
  closing: "마무리",
};

/**
 * 사람끼리 주고받는 메신저처럼 보이지 않게 한다.
 * 질문은 서류처럼 흰 카드에, 내 답변은 옅은 색 블록으로 오른쪽에 들여 쓴다.
 */
export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isAi = message.role === "ai";

  if (isAi) {
    return (
      <article className="rounded-md border border-line bg-surface px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={labelClass}>{AI_LABEL[message.kind] ?? "질문"}</p>
          <time
            dateTime={message.at}
            className="num text-[11px] text-ink-3"
            suppressHydrationWarning
          >
            {formatTime(message.at)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          {message.text}
        </p>
      </article>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 pl-8">
      <p className="w-full whitespace-pre-wrap rounded-md bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">
        {message.text}
      </p>
      <time
        dateTime={message.at}
        className="num px-1 text-[11px] text-ink-3"
        suppressHydrationWarning
      >
        {formatTime(message.at)} 보냄
      </time>
    </div>
  );
}
