"use client";

import { useState } from "react";
import VariantReport from "@/components/design/VariantReport";
import VariantScoreboard from "@/components/design/VariantScoreboard";
import VariantWorkbench from "@/components/design/VariantWorkbench";
import type { CandidateRow, InterviewReport } from "@/lib/types";

type VariantKey = "report" | "workbench" | "scoreboard";

type VariantInfo = {
  key: VariantKey;
  name: string;
  tagline: string;
  /** 어떤 상황을 가정한 안인지 */
  fit: string;
  /** 대신 포기한 것 */
  cost: string;
};

const VARIANTS: VariantInfo[] = [
  {
    key: "report",
    name: "시안 A · 리포트형",
    tagline: "한 장짜리 문서처럼 위에서 아래로 읽는 화면",
    fit: "면접 결과를 팀에 공유하거나 인쇄해서 회의에 들고 갈 때. 화면을 처음 보는 사람도 순서대로 읽으면 이해됩니다.",
    cost: "점수를 고치는 조작이 본문 사이사이에 있어, 여러 문항을 빠르게 손보기에는 불편합니다.",
  },
  {
    key: "workbench",
    name: "시안 B · 작업대형",
    tagline: "왼쪽 문항 목록 · 가운데 답변 · 오른쪽 채점 패널",
    fit: "채점이 주된 일일 때. 점수 입력칸이 항상 오른쪽 같은 자리에 붙어 있어 스크롤과 상관없이 바로 고칠 수 있습니다.",
    cost: "화면을 세로로 3등분하기 때문에 좁은 화면(노트북·모바일)에서는 답답합니다.",
  },
  {
    key: "scoreboard",
    name: "시안 C · 스코어보드형",
    tagline: "점수를 먼저 보여주고, 근거는 펼쳐서 확인",
    fit: "하루에 후보자 여러 명을 훑어볼 때. 위쪽 요약만 보고 지나갈지, 열어서 읽을지 빠르게 정할 수 있습니다.",
    cost: "점수가 가장 크게 보이는 만큼, 근거를 읽지 않고 숫자만 보고 넘길 위험이 가장 큽니다.",
  },
];

export default function DesignGallery({
  report,
  candidates,
}: {
  report: InterviewReport;
  candidates: CandidateRow[];
}) {
  const [current, setCurrent] = useState<VariantKey>("report");
  const info = VARIANTS.find((variant) => variant.key === current) ?? VARIANTS[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-xs tracking-wider text-slate-500">디자인 시안</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        결과 리뷰 화면, 세 가지 방향
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        내용(점수 · 근거 · 답변)은 셋 다 똑같습니다. 다른 것은 그것을{" "}
        <strong className="font-semibold text-slate-900">
          어떤 순서로, 얼마나 크게
        </strong>{" "}
        보여주느냐입니다. 아래에서 하나를 고르면 실제 화면이 그대로 그려집니다.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VARIANTS.map((variant) => (
          <button
            key={variant.key}
            type="button"
            onClick={() => setCurrent(variant.key)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              variant.key === current
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {variant.name}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{info.tagline}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold text-emerald-700">
              이럴 때 좋습니다
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">
              {info.fit}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-rose-700">
              대신 이런 점을 포기합니다
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">
              {info.cost}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300">
        {current === "report" && <VariantReport report={report} />}
        {current === "workbench" && <VariantWorkbench report={report} />}
        {current === "scoreboard" && (
          <VariantScoreboard report={report} candidates={candidates} />
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        시안은 보여주기 위한 화면이라 점수 입력·저장은 동작하지 않습니다.
        실제로 동작하는 화면은 결과 리뷰 화면에 있습니다.
      </p>
    </main>
  );
}
