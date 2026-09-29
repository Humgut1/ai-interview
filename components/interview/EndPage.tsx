import type { ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";

/** "2026-09-29T14:32:00+09:00" → "9/29 14:32" (이미 한국 시각으로 바꾼 값) */
export function kstShort(iso: string | null | undefined) {
  if (!iso || iso.length < 16) return "";
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} ${iso.slice(11, 16)}`;
}

/**
 * 후보자 화면의 끝 장 — 제출 완료 · 잠시 나감 · 지원 그만둠.
 * 머리 띠는 로고 + 회사 이름만, 본문은 가운데 한 줄(560px).
 */
export default function EndPage({
  org,
  kicker,
  tone = "ok",
  title,
  facts = [],
  children,
}: {
  org: string;
  /** 제목 위 한 줄 — "백엔드 개발자 · 1차 영상 면접" */
  kicker: string;
  tone?: "ok" | "off";
  title: string;
  facts?: ReactNode[];
  children?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-[60px] items-center justify-between gap-4 border-b border-line bg-surface px-4 md:px-7">
        <BrandMark product="screen" size={20} className="shrink-0 text-ink" />
        <span className="truncate text-sm text-ink-2">{org}</span>
      </header>
      <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-12 md:pt-24">
        <p className="flex items-center gap-2 text-[13px] text-ink-3">
          <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${tone === "ok" ? "bg-st-ok" : "bg-st-off"}`} />
          <span className="truncate">{kicker}</span>
        </p>
        <h1 className="mt-2.5 text-[28px] font-bold tracking-tight text-ink">{title}</h1>
        {facts.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {facts.map((fact, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <span aria-hidden className="text-ink-3">·</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </main>
    </div>
  );
}
