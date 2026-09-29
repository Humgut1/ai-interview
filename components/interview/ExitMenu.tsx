"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { WITHDRAW_REASON_LABEL, type WithdrawReason } from "@/lib/requests";

/*
 * 영상 면접의 [나가기 ▾] 메뉴와 두 확인 창(C6 잠시 나가기 · C7 지원 그만두기).
 * 서버에 알리는 일은 부르는 쪽(VideoInterview)이 한다 — 여기는 묻고 고르게만 한다.
 */

export type ExitKind = "leave" | "withdraw";

/** 머리 띠 오른쪽 [나가기 ▾]. 바깥을 누르거나 Esc 면 닫힌다. */
export function ExitMenu({ disabled, onPick }: { disabled?: boolean; onPick: (kind: ExitKind) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = (kind: ExitKind, label: string, note: string) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onPick(kind);
      }}
      className="block w-full px-4 py-3 text-left hover:bg-mute"
    >
      <span className="block text-sm font-semibold text-ink">{label}</span>
      <span className="mt-0.5 block text-xs text-ink-3">{note}</span>
    </button>
  );

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-[13px] text-ink hover:bg-mute disabled:text-ink-3"
      >
        나가기
        <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[240px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
        >
          {item("leave", "잠시 나가기", "같은 링크로 이어서 합니다")}
          <div className="border-t border-line" />
          {item("withdraw", "지원 그만두기", "올린 영상을 바로 지웁니다")}
        </div>
      ) : null}
    </div>
  );
}

/** 가운데 뜨는 확인 창 틀. */
function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-xl border border-line bg-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Facts({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {items.map((fact, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-2">
          <span aria-hidden className="text-ink-3">·</span>
          <span>{fact}</span>
        </li>
      ))}
    </ul>
  );
}

/** C6 잠시 나갈까요? */
export function LeaveDialog({
  sent,
  current,
  deadline,
  busy,
  failure,
  onStay,
  onLeave,
}: {
  sent: number;
  current: number;
  deadline: string | null;
  busy: boolean;
  failure: string | null;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <Dialog title="잠시 나갈까요?" onClose={onStay}>
      <Facts
        items={[
          <span key="sent" className="num">보낸 답 {sent}개는 저장되어 있습니다</span>,
          <span key="back" className="num">
            {deadline ? `${deadline} 까지` : "기한 안에"} 같은 링크로 들어오면 질문 {current}부터 이어집니다
          </span>,
          <span key="again" className="num">
            질문 {current}은 준비 시간부터 다시 시작합니다. 녹화 중이던 답은 저장되지 않습니다
          </span>,
          "나갔다 들어온 기록은 담당자에게 보입니다",
        ]}
      />
      {failure ? (
        <p role="alert" className="mt-3 text-sm text-st-bad">
          {failure}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onStay} disabled={busy} className={`${btnSecondary} h-10 px-4`}>
          계속하기
        </button>
        <button type="button" onClick={onLeave} disabled={busy} className={`${btnPrimary} h-10 px-4`}>
          나가기
        </button>
      </div>
    </Dialog>
  );
}

const REASONS: WithdrawReason[] = ["offer", "schedule", "fit", "none"];

/** C7 지원을 그만둘까요? — 이유는 골라도 되고 안 골라도 된다. 확인 칸을 눌러야 버튼이 켜진다. */
export function WithdrawDialog({
  videos,
  busy,
  failure,
  onStay,
  onWithdraw,
}: {
  videos: number;
  busy: boolean;
  failure: string | null;
  onStay: () => void;
  onWithdraw: (reason: WithdrawReason) => void;
}) {
  const [reason, setReason] = useState<WithdrawReason | null>(null);
  const [sure, setSure] = useState(false);
  return (
    <Dialog title="지원을 그만둘까요?" onClose={onStay}>
      <Facts
        items={[
          <span key="del" className="num">
            {videos > 0
              ? `올린 답변 영상 ${videos}개와 받아 적은 글을 지금 바로 지웁니다`
              : "아직 올린 답변 영상은 없습니다"}
          </span>,
          "이 링크로는 다시 면접을 볼 수 없습니다",
          "채용 담당자에게 \"후보자가 지원을 그만둠\"으로 알립니다",
          "지운 영상은 되돌릴 수 없습니다",
        ]}
      />
      <p className="mt-5 text-[13px] font-semibold text-ink">
        이유 <span className="font-normal text-ink-3">· 고르지 않아도 됩니다</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={reason === key}
            onClick={() => setReason((v) => (v === key ? null : key))}
            className={`h-8 rounded-full border px-3 text-[13px] ${
              reason === key ? "border-ink bg-ink text-surface" : "border-line-strong text-ink-2 hover:bg-mute"
            }`}
          >
            {WITHDRAW_REASON_LABEL[key]}
          </button>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-ink">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-4 w-4" />
        영상이 바로 지워지는 것을 확인했습니다
      </label>
      {failure ? (
        <p role="alert" className="mt-3 text-sm text-st-bad">
          {failure}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button type="button" onClick={onStay} disabled={busy} className={`${btnSecondary} h-10 px-4`}>
          계속 면접 보기
        </button>
        <button
          type="button"
          onClick={() => onWithdraw(reason ?? "none")}
          disabled={!sure || busy}
          className={`${btnPrimary} h-10 px-4`}
        >
          {busy ? "지우는 중" : "영상 지우고 그만두기"}
        </button>
      </div>
    </Dialog>
  );
}
