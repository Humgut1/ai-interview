"use client";

import { useState } from "react";
import RequestBox from "@/components/interview/RequestBox";
import { btnPrimary, cardClass, labelClass, panelClass } from "@/components/ui/styles";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSetup } from "@/lib/types";

const VIDEO_NOTICES = (setup: InterviewSetup) => [
  "시작 전에 카메라와 마이크가 잘 되는지 먼저 확인합니다.",
  `질문이 나오면 ${sec(setup.video.prepSec)} 동안 생각한 뒤 녹화가 시작됩니다. 준비되면 바로 시작해도 됩니다.`,
  `답변은 질문마다 최대 ${sec(setup.video.answerSec)}입니다. 시간이 되면 녹화가 멈춥니다.`,
  setup.video.retakes > 0
    ? `녹화한 답변은 보내기 전에 다시 볼 수 있고, 질문마다 ${setup.video.retakes}번 다시 찍을 수 있습니다.`
    : "녹화한 답변은 보내기 전에 다시 볼 수 있습니다. 다시 찍기는 없습니다.",
  "답변이 짧으면 한 번 더 자세히 여쭤보는 질문이 이어질 수 있습니다.",
  "얼굴 표정·목소리 톤·배경은 평가하지 않습니다. 말씀하신 내용만 미리 정해 둔 기준으로 봅니다.",
  "중간에 창을 닫아도 같은 링크로 다시 들어오면 이어서 진행할 수 있습니다.",
];

function sec(value: number) {
  if (value < 60) return `${value}초`;
  return value % 60 ? `${Math.floor(value / 60)}분 ${value % 60}초` : `${value / 60}분`;
}

const NOTICES = [
  "질문은 한 번에 하나씩 나옵니다. 답변을 보내면 다음 질문으로 넘어갑니다.",
  "답변이 짧으면 조금 더 자세히 여쭤보는 질문이 이어질 수 있습니다.",
  "보낸 답변은 수정할 수 없습니다. 충분히 생각한 뒤 보내 주세요.",
  "중간에 창을 닫아도 같은 링크로 다시 들어오면 이어서 진행할 수 있습니다.",
  "말투나 성격이 아니라, 미리 정해 둔 기준에 따라 답변 내용만 평가합니다.",
];

/**
 * 동의 화면. 무엇을 모으고, 왜 쓰고, 누가 보고, 언제 지우는지 + 후보자가 할 수 있는 요청.
 * 문구를 바꾸면 lib/store.ts 의 CONSENT_VERSION 날짜를 올린다.
 */
function dataRows(rights: CandidateRights, video: boolean): [string, string][] {
  return [
    [
      "모으는 것",
      video
        ? "답변 영상(얼굴과 목소리), 영상에서 받아 적은 글, 보낸 시각"
        : "이 화면에서 보내 주신 답변 글과 보낸 시각",
    ],
    ["쓰는 곳", "이 채용 전형의 평가 자료로만 씁니다"],
    ["보는 사람", "이 공고의 채용 담당자와 면접관"],
    [
      "AI 의 역할",
      video
        ? "받아 적은 답변 내용을 미리 정한 기준에 따라 보고 점수와 근거 문장을 제안합니다. 표정·목소리 톤·외모는 보지 않습니다. 합격 여부는 채용 담당자가 답변을 보고 결정합니다."
        : "미리 정한 기준에 따라 점수와 근거 문장을 제안합니다. 합격 여부는 채용 담당자가 답변을 읽고 결정합니다.",
    ],
    ...(rights.aiAbroad
      ? ([["국외 처리", "평가 보조를 위해 답변이 미국 Anthropic 의 AI 서버에서 처리됩니다. 학습에는 쓰이지 않습니다."]] as [string, string][])
      : []),
    ["보관 기간", `제출일로부터 ${rights.retentionDays}일. 지나면 자동으로 지웁니다.`],
    [
      "요청할 수 있는 것",
      "AI 면접 대신 담당자 면접 · 평가 결과 설명 · 기록 삭제. 요청해도 전형에서 불이익은 없습니다.",
    ],
  ];
}

export default function ConsentScreen({
  setup,
  rights,
  onRights,
  onStart,
}: {
  setup: InterviewSetup;
  rights: CandidateRights;
  onRights: (rights: CandidateRights) => void;
  onStart: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const video = setup.mode === "video";
  const notices = video ? VIDEO_NOTICES(setup) : NOTICES;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-10">
      <p className={labelClass}>1차 면접 안내</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {setup.jobTitle}
      </h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        {video
          ? "지원해 주셔서 감사합니다. 질문마다 답변을 녹화하는 1차 영상 면접입니다. 조용하고 밝은 곳에서 시작해 주세요."
          : "지원해 주셔서 감사합니다. 채팅으로 진행하는 1차 면접입니다. 준비되셨을 때 시작해 주세요."}
      </p>

      <dl className={`${cardClass} mt-6 grid grid-cols-3 divide-x divide-line`}>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>질문 수</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {setup.questions.length}
            <span className="ml-0.5 text-xs text-ink-3">문항</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>예상 소요</dt>
          <dd className="num mt-1.5 text-xl text-ink">
            {setup.estimatedMinutes}
            <span className="ml-0.5 text-xs text-ink-3">분</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className={labelClass}>{video ? "답변 시간" : "제한 시간"}</dt>
          <dd className="mt-1.5 text-xl text-ink">
            {video ? sec(setup.video.answerSec) : "없음"}
          </dd>
        </div>
      </dl>

      <section className={`${cardClass} mt-4 px-5 py-4`}>
        <h2 className={labelClass}>진행 방식</h2>
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {notices.map((notice, index) => (
            <li key={notice} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
              <span aria-hidden className="num shrink-0 text-xs text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-ink-2">
                {notice}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${panelClass} mt-4 px-5 py-4`}>
        <h2 className={labelClass}>답변은 이렇게 쓰입니다</h2>
        <dl className="mt-3 flex flex-col divide-y divide-line">
          {dataRows(rights, video).map(([term, desc]) => (
            <div key={term} className="flex flex-col gap-0.5 py-2.5 first:pt-0 sm:flex-row sm:gap-4">
              <dt className="shrink-0 text-sm font-semibold text-ink sm:w-32">{term}</dt>
              <dd className="text-sm leading-relaxed text-ink-2">{desc}</dd>
            </div>
          ))}
        </dl>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-ink"
          />
          <span>
            {video
              ? "위 내용을 확인했고, 답변 영상 녹화와 활용에 동의합니다."
              : "위 내용을 확인했고, 답변 데이터 활용에 동의합니다."}
          </span>
        </label>
      </section>

      <RequestBox
        token={setup.token}
        rights={rights}
        kinds={["human"]}
        onRights={onRights}
        title="AI 면접이 어려우신가요"
      />

      {/* 화면이 길어도 시작 버튼은 늘 아래에 붙어 있게 한다. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-5 py-3">
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={onStart}
            disabled={!agreed}
            className={`${btnPrimary} w-full py-3`}
          >
            면접 시작하기
          </button>
          {agreed ? null : (
            <p className="mt-1.5 text-center text-xs text-ink-3">
              동의하셔야 시작할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
