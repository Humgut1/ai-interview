"use client";

import { useState, type ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";

/** 후보자 화면 머리 띠의 단계 하나. done 이면 초록 점, on 이면 진하게. */
export type TopStep = { label: string; done?: boolean; on?: boolean };

/**
 * 후보자 화면 공통 머리 띠 — 로고 + 제목 · (가운데) 단계 · (오른쪽) 도움말.
 * 도움말을 누르면 띠 바로 아래에 안내가 펼쳐진다.
 */
export default function CandidateTop({
  title,
  steps,
  right,
}: {
  title: string;
  steps?: TopStep[];
  /** 오른쪽 끝에 붙는 것 — 영상 면접의 [나가기] 메뉴 */
  right?: ReactNode;
}) {
  const [help, setHelp] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-20 grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-surface px-4 md:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark product="screen" size={20} className="shrink-0 text-ink" />
          <span className="truncate text-sm font-semibold text-ink">{title}</span>
        </div>
        <ol className="hidden items-center gap-2 text-[13px] md:flex" aria-label="진행 단계">
          {(steps ?? []).map((step, index) => (
            <li key={step.label} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden className="h-px w-6 bg-line-strong" /> : null}
              <span
                aria-hidden
                className={`h-[7px] w-[7px] rounded-full ${
                  step.done ? "bg-st-ok" : step.on ? "bg-ink" : "bg-line-strong"
                }`}
              />
              <span
                aria-current={step.on ? "step" : undefined}
                className={`num ${step.on ? "font-semibold text-ink" : step.done ? "text-ink-2" : "text-ink-3"}`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => setHelp((v) => !v)}
            aria-expanded={help}
            className="text-[13px] text-ink-2 underline-offset-2 hover:text-ink hover:underline"
          >
            도움이 필요하신가요
          </button>
          {right}
        </div>
      </header>
      {help ? (
        <div className="border-b border-line bg-surface px-4 pb-4 md:px-7">
          <div className="mx-auto w-full max-w-[1080px]">
            <ul className="flex flex-col gap-1 pt-3 text-[13px] text-ink-2">
              <li>· 카메라가 안 켜지면 주소창 왼쪽 자물쇠에서 카메라·마이크를 허용으로 바꿔 주세요</li>
              <li>· 창을 닫아도 같은 링크로 다시 들어오면 그 질문부터 이어집니다</li>
              <li>· 보낸 답변은 바꿀 수 없습니다</li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
