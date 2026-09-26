"use client";

import RequestBox from "@/components/interview/RequestBox";
import { labelClass } from "@/components/ui/styles";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSetup } from "@/lib/types";

/** AI 대신 담당자 면접을 요청한 뒤의 화면. 이 링크로는 AI 면접을 더 할 수 없다. */
export default function OptedOutScreen({
  setup,
  rights,
  onRights,
}: {
  setup: InterviewSetup;
  rights: CandidateRights;
  onRights: (rights: CandidateRights) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <p className={labelClass}>요청 접수</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        담당자 면접 요청을 받았습니다
      </h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        {setup.jobTitle} 채용 담당자가 면접 일정을 따로 안내드립니다. 이 요청으로 전형에서
        불이익은 없습니다. 이 링크로는 AI 면접을 더 진행할 수 없습니다.
      </p>
      <RequestBox
        token={setup.token}
        rights={rights}
        kinds={["human", "delete"]}
        onRights={onRights}
        title="요청 현황"
      />
    </div>
  );
}
