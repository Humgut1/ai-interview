"use client";

import { useState } from "react";
import BrandMark from "@/components/brand/BrandMark";
import { btnPrimary } from "@/components/ui/styles";
import type { InterviewSetup } from "@/lib/types";

/**
 * 폰·좁은 화면으로 영상 면접 링크를 열었을 때. 면접은 시작하지 않고 아무것도 기록하지 않는다.
 * 링크를 복사해 PC 로 옮기게 한다.
 */
export default function PhoneGate({
  setup,
  deadline,
  org,
}: {
  setup: InterviewSetup;
  deadline: string | null;
  org: string;
}) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const url = typeof window === "undefined" ? "" : window.location.href;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-[54px] items-center gap-2.5 border-b border-line bg-surface px-4">
        <BrandMark product="screen" size={20} className="text-ink" />
        <span className="truncate text-sm font-semibold text-ink">{org}</span>
      </header>
      <main className="mx-auto w-full max-w-md px-5 pb-12 pt-10">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink" aria-hidden>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">PC 에서 열어 주세요</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          영상 면접은 카메라가 있는 PC 에서 봅니다. 링크를 복사해 PC 로 보내 주세요.
        </p>

        <div className="mt-6 rounded-md border border-line bg-surface px-4 py-3.5">
          <p className="text-sm font-semibold text-ink">{setup.jobTitle} · 1차 영상 면접</p>
          <p className={`num mt-2 break-all rounded-md border px-3 py-2 text-xs text-ink-2 ${copied === "fail" ? "select-all border-ink bg-sand" : "border-line bg-canvas"}`}>
            {url}
          </p>
          <p className="num mt-2 text-xs text-ink-3">
            {[deadline ? `${deadline} 까지` : null, `질문 ${setup.questions.length}`, `약 ${setup.estimatedMinutes}분`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <button type="button" onClick={copy} className={`${btnPrimary} mt-4 h-12 w-full`}>
          {copied === "ok" ? "복사했습니다" : "링크 복사"}
        </button>
        {copied === "fail" ? (
          <p role="alert" className="mt-2 text-xs text-ink-2">
            복사가 막혀 있습니다. 위 링크를 길게 눌러 복사해 주세요.
          </p>
        ) : null}
      </main>
    </div>
  );
}
