"use client";

import { useRef, useState } from "react";
import { textareaClass } from "@/components/ui/Field";
import { btnSecondary, cardClass, labelClass } from "@/components/ui/styles";
import { candidateRequestAction } from "@/app/actions";
import type { CandidateRights, RequestKind } from "@/lib/store";

/** 버튼마다: 이름 · 누르기 전 확인 문장 · 메모 칸을 둘지 · 접수 뒤 문장 */
const KIND: Record<
  RequestKind,
  { label: string; confirm: string; note: boolean; done: string }
> = {
  human: {
    label: "AI 대신 담당자 면접 요청",
    confirm: "AI 면접을 그만두고 채용 담당자와 직접 면접하도록 요청합니다. 요청하면 이 링크로 AI 면접을 이어 갈 수 없습니다.",
    note: false,
    done: "담당자 면접 요청을 받았습니다.",
  },
  explain: {
    label: "결과 설명 요청",
    confirm: "어떤 기준으로 평가했는지 채용 담당자에게 설명을 요청합니다. 궁금한 점이 있으면 적어 주세요(선택).",
    note: true,
    done: "설명 요청을 받았습니다. 채용 담당자가 연락드립니다.",
  },
  delete: {
    label: "내 면접 기록 삭제 요청",
    confirm: "이 면접의 답변과 평가 기록을 지우도록 요청합니다. 늦어도 10일 안에 지워지며, 지운 뒤에는 이 전형에서 답변을 다시 볼 수 없습니다.",
    note: false,
    done: "삭제 요청을 받았습니다. 늦어도 10일 안에 지워집니다.",
  },
};

const FAIL: Record<string, string> = {
  purged: "이미 지운 기록입니다.",
  "not-now": "지금은 이 요청을 할 수 없습니다. 화면을 새로 불러와 주세요.",
  missing: "면접 링크를 찾을 수 없습니다.",
  error: "요청을 보내지 못했습니다. 연결을 확인하고 다시 눌러 주세요.",
};

/**
 * 후보자 권리 버튼 묶음. 누르면 확인 한 번 → 서버에 요청 → Hire 할 일이 된다.
 * 같은 요청은 처리 전까지 한 건이라 두 번 눌러도 늘지 않는다.
 */
export default function RequestBox({
  token,
  rights,
  kinds,
  onRights,
  title = "요청하기",
}: {
  token: string;
  rights: CandidateRights;
  kinds: RequestKind[];
  onRights: (rights: CandidateRights) => void;
  title?: string;
}) {
  const [asking, setAsking] = useState<RequestKind | null>(null);
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function send(kind: RequestKind) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const reply = await candidateRequestAction(token, kind, KIND[kind].note ? note : "");
      if (reply.ok) {
        setAsking(null);
        setNote("");
        onRights(reply.rights);
      } else setFailure(FAIL[reply.reason] ?? FAIL.error);
    } catch {
      setFailure(FAIL.error);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={`${cardClass} mt-4 px-5 py-4`}>
      <h2 className={labelClass}>{title}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {kinds.map((kind) => {
          const meta = KIND[kind];
          const open = rights.open.includes(kind) || (kind === "human" && rights.optedOut);
          if (open) {
            return (
              <li key={kind} className="text-sm text-ink-2">
                <span className="mr-2 rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                  접수됨
                </span>
                {meta.done}
              </li>
            );
          }
          if (asking === kind) {
            return (
              <li key={kind} className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-ink">{meta.confirm}</p>
                {meta.note ? (
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    aria-label="궁금한 점"
                    className={textareaClass}
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => send(kind)}
                    disabled={busy}
                    className={`${btnSecondary} border-ink`}
                  >
                    {busy ? "보내는 중" : "요청하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsking(null)}
                    disabled={busy}
                    className="px-2 text-sm text-ink-3 hover:text-ink"
                  >
                    취소
                  </button>
                </div>
              </li>
            );
          }
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => {
                  setAsking(kind);
                  setFailure(null);
                }}
                className="text-sm text-ink underline underline-offset-2 hover:text-ink-2"
              >
                {meta.label}
              </button>
            </li>
          );
        })}
      </ul>
      {failure ? (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {failure}
        </p>
      ) : null}
    </section>
  );
}
