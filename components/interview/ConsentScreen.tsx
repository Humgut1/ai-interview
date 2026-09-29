"use client";

import { useState } from "react";
import CandidateTop from "@/components/interview/CandidateTop";
import RequestBox from "@/components/interview/RequestBox";
import { btnPrimary } from "@/components/ui/styles";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSetup } from "@/lib/types";

export function clock(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * 무엇을 모으고, 왜 쓰고, 누가 보고, 언제 지우는지 + 후보자가 할 수 있는 요청.
 * 문구를 바꾸면 lib/requests.ts 의 CONSENT_VERSION 날짜를 올린다.
 */
function dataRows(rights: CandidateRights, video: boolean): [string, string][] {
  return [
    [
      "모으는 것",
      video ? "답변 영상(얼굴과 목소리), 받아 적은 글, 보낸 시각" : "보내 주신 답변 글과 보낸 시각",
    ],
    ["쓰는 곳", "이 채용 전형의 평가 자료로만"],
    ["보는 사람", "이 공고의 채용 담당자와 면접관"],
    [
      "AI 의 역할",
      video
        ? "받아 적은 내용만 기준에 따라 봅니다. 표정·목소리 톤·외모는 보지 않습니다. 합격 여부는 사람이 정합니다."
        : "미리 정한 기준에 따라 점수와 근거 문장을 제안합니다. 합격 여부는 사람이 정합니다.",
    ],
    ...(video && rights.sttVendor
      ? ([["받아 적기 위탁", `국내 업체 ${rights.sttVendor}`]] as [string, string][])
      : []),
    ...(rights.aiAbroad
      ? ([["국외 처리", "평가 보조를 위해 미국 Anthropic 의 AI 서버에서 처리합니다. 학습에는 쓰이지 않습니다."]] as [string, string][])
      : []),
    ["보관 기간", `제출일로부터 ${rights.retentionDays}일, 지나면 자동 삭제`],
    ["요청할 수 있는 것", "담당자 면접 · 결과 설명 · 기록 삭제 (불이익 없음)"],
  ];
}

/** C1 첫 화면 — 왼쪽 안내(단계·시작 전에), 오른쪽 동의 카드. PC 기준. */
export default function ConsentScreen({
  setup,
  rights,
  onRights,
  onStart,
  org,
  deadline,
  busy,
  failure,
}: {
  setup: InterviewSetup;
  rights: CandidateRights;
  onRights: (rights: CandidateRights) => void;
  onStart: () => void;
  org: string;
  deadline: string | null;
  busy: boolean;
  failure: string | null;
}) {
  const [agreed, setAgreed] = useState(false);
  const video = setup.mode === "video";
  const n = setup.questions.length;
  const { prepSec, answerSec, retakes } = setup.video;

  const steps: [string, string][] = video
    ? [
        ["기기 확인", "카메라 · 마이크"],
        ...(setup.video.practice
          ? ([["연습 질문", "몇 번이든 · 저장하지 않고 담당자에게 안 보냄"]] as [string, string][])
          : []),
        [`실전 질문 ${n}개`, `질문마다 준비 ${clock(prepSec)} · 답변 최대 ${clock(answerSec)}`],
      ]
    : [
        [`질문 ${n}개`, "한 번에 하나씩 · 시간 제한 없음"],
        ["제출", "마지막 답변을 보내면 끝"],
      ];

  const before = video
    ? [
        "카메라가 있는 PC · 크롬, 엣지, 사파리 최신판",
        "조용하고 밝은 곳 · 이어폰 사용 가능",
        "창을 닫아도 같은 링크로 들어오면 그 질문부터 이어집니다",
      ]
    : [
        "답변이 짧으면 조금 더 여쭤보는 질문이 이어질 수 있습니다",
        "보낸 답변은 바꿀 수 없습니다",
        "창을 닫아도 같은 링크로 들어오면 그 질문부터 이어집니다",
      ];

  return (
    <div className="min-h-dvh bg-canvas">
      <CandidateTop title={org} setup={setup} rights={rights} onRights={onRights} />
      <main className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:grid-cols-[minmax(0,1fr)_460px] md:px-16 md:py-12">
        <section className="min-w-0">
          <p className="num text-[13px] text-ink-3">
            {video ? "1차 영상 면접" : "1차 면접"}
            {deadline ? ` · ${deadline} 까지` : ""}
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-ink">{setup.jobTitle}</h1>
          <p className="num mt-2 text-sm text-ink-2">
            {[
              `질문 ${n}`,
              `약 ${setup.estimatedMinutes}분`,
              video ? (retakes > 0 ? `다시 찍기 질문마다 ${retakes}번` : "다시 찍기 없음") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <ol className="mt-8 flex flex-col gap-2.5">
            {steps.map(([title, sub], index) => (
              <li key={title} className="flex items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4">
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[13px] font-semibold text-ink">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{title}</p>
                  <p className="num mt-0.5 text-[13px] text-ink-3">{sub}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-9 text-sm font-semibold text-ink">시작 전에</h2>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-sm text-ink-2">
            {before.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </section>

        <aside className="self-start rounded-lg border border-line bg-surface px-6 py-6">
          <h2 className="text-base font-semibold text-ink">답변은 이렇게 쓰입니다</h2>
          <dl className="mt-4 flex flex-col">
            {dataRows(rights, video).map(([term, desc]) => (
              <div key={term} className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
                <dt className="text-[13px] text-ink-3">{term}</dt>
                <dd className="text-[13px] leading-relaxed text-ink">{desc}</dd>
              </div>
            ))}
          </dl>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-line pt-4 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
            />
            <span>
              {video
                ? "위 내용을 확인했고, 답변 영상 녹화와 활용에 동의합니다"
                : "위 내용을 확인했고, 답변 데이터 활용에 동의합니다"}
            </span>
          </label>
          <button
            type="button"
            onClick={onStart}
            disabled={!agreed || busy}
            className={`${btnPrimary} mt-4 h-12 w-full`}
          >
            {busy ? "준비하는 중" : video ? "동의하고 기기 확인" : "동의하고 시작"}
          </button>
          {failure ? (
            <p role="alert" className="mt-3 text-sm text-st-bad">
              {failure}
            </p>
          ) : null}
          <RequestBox
            token={setup.token}
            rights={rights}
            kinds={["human"]}
            onRights={onRights}
            title="AI 면접이 어려우면"
            bare
          />
        </aside>
      </main>
    </div>
  );
}
