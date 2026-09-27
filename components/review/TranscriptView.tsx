"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clockOf } from "@/lib/review";
import type { ChatMessage } from "@/lib/types";

const KIND_LABEL: Record<ChatMessage["kind"], string> = {
  intro: "안내",
  question: "질문",
  followUp: "후속 질문",
  answer: "답변",
  closing: "마무리",
};

/** 받아 적는 중일 때 화면을 다시 불러 결과를 받는 간격·최대 횟수(약 5분) */
const REFRESH_MS = 8_000;
const REFRESH_MAX = 40;

export function clock(total: number) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 받아 적기 상태 한 마디. 실패·멈춤은 사유를 붙인다. */
export function sttLabel(message: ChatMessage, ready: boolean) {
  const note = message.sttNote;
  if (message.stt === "done") return note ? `받아 적음 · ${note}` : "받아 적음";
  if (message.stt === "failed") return `받아 적기 실패${note ? ` · ${note}` : ""} · 영상을 직접 확인하세요`;
  if (!ready) return "받아 적기 서비스 미연결";
  return note ? `받아 적기 멈춤 · ${note}` : "받아 적는 중";
}

/** 영상 답변 한 줄 — 길이 · 몇 번째 녹화 */
function mediaLine(message: ChatMessage) {
  if (!message.media) return null;
  const parts = [`영상 답변 ${clock(message.media.seconds)}`];
  if (message.media.take > 1) parts.push(`${message.media.take}번째 녹화`);
  return parts.join(" · ");
}

/**
 * 면접에서 오간 대화 전문.
 * 점수만 보고 판단하지 않도록, 리포트에서 언제든 원문을 확인할 수 있어야 한다.
 */
export default function TranscriptView({
  transcript,
  sttReady = false,
}: {
  transcript: ChatMessage[];
  sttReady?: boolean;
}) {
  const router = useRouter();
  const waiting = sttReady && transcript.some((m) => m.stt === "pending" && !m.sttNote);

  // 받아 적는 중이면 잠깐씩 화면을 다시 불러 결과를 받는다(검토 입력 중인 값은 그대로 남는다)
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const timer = setInterval(() => {
      if (++n > REFRESH_MAX) clearInterval(timer);
      else if (!document.hidden) router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

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
                <p className="mt-1 text-xs text-ink-2">
                  {mediaLine(message)} ·{" "}
                  <span
                    className={
                      message.stt === "failed"
                        ? "font-semibold text-amber-800 dark:text-amber-300"
                        : undefined
                    }
                  >
                    {sttLabel(message, sttReady)}
                  </span>
                </p>
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
