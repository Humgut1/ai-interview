"use client";

import { useRef, useState, type ReactNode } from "react";
import { clock, sttLabel } from "@/components/review/TranscriptView";
import type { ChatMessage } from "@/lib/types";

/**
 * 영상 답변 한 개 — 왼쪽(좁으면 위) 영상, 오른쪽 받아 적은 글.
 * 글 토막의 시각을 누르면 영상이 그 자리로 간다. 재생 중인 토막은 진하게.
 * 영상 주소는 잠깐만 열린다. 화면이 새로고침돼 새 주소가 와도 처음 받은 주소를 그대로 써서 재생이 끊기지 않는다.
 */
export default function VideoAnswer({
  message,
  sttReady,
  renderText = (text) => text,
}: {
  message: ChatMessage;
  sttReady: boolean;
  /** 글에 근거 표시를 덧칠할 때 (채점 카드) */
  renderText?: (text: string) => ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const first = useRef(message.media?.url);
  const [now, setNow] = useState(-1);
  const [broken, setBroken] = useState(false);
  if (!message.media) return null;
  const src = first.current ?? message.media.url;
  const segments = message.segments ?? [];

  function seek(s: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = s;
    void v.play().catch(() => {});
  }

  const meta = [
    `영상 ${clock(message.media.seconds)}`,
    message.media.take > 1 ? `${message.media.take}번째 녹화` : "",
    sttLabel(message, sttReady),
  ].filter(Boolean);

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <div className="min-w-0">
        {src && !broken ? (
          <video
            ref={video}
            src={src}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            onError={() => setBroken(true)}
            className="aspect-video w-full rounded-md bg-black"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-md border border-line bg-mute px-4 text-center text-xs text-ink-2">
            {broken ? "영상 주소가 만료되었습니다. 화면을 새로 불러오세요." : "영상을 불러오지 못했습니다."}
          </div>
        )}
        <p
          className={`mt-1.5 text-[11.5px] ${
            message.stt === "failed" ? "font-semibold text-amber-800 dark:text-amber-300" : "text-ink-3"
          }`}
        >
          {meta.join(" · ")}
        </p>
      </div>

      <div className="min-w-0">
        {segments.length ? (
          <ol className="flex flex-col gap-1">
            {segments.map((seg, i) => {
              const on = now >= seg.s && now < (segments[i + 1]?.s ?? Infinity);
              return (
                <li key={`${seg.s}-${i}`} className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => seek(seg.s)}
                    className="num h-fit shrink-0 rounded-sm px-1 text-[11.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
                    aria-label={`${clock(seg.s)} 부터 재생`}
                  >
                    {clock(seg.s)}
                  </button>
                  <p
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      on ? "font-semibold text-ink" : "text-ink"
                    }`}
                  >
                    {renderText(seg.t)}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : message.text ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {renderText(message.text)}
          </p>
        ) : (
          <p className="text-sm text-ink-3">받아 적은 글이 아직 없습니다. 영상으로 확인하세요.</p>
        )}
      </div>
    </div>
  );
}
