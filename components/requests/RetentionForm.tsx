"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { btnPrimary } from "@/components/ui/styles";
import { saveRetentionAction } from "@/app/actions";
import { RETENTION_MAX, RETENTION_MIN } from "@/lib/requests";

export default function RetentionForm({
  initial,
  editable,
}: {
  initial: number;
  editable: boolean;
}) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= RETENTION_MIN && n <= RETENTION_MAX;

  async function save() {
    if (busy.current || !valid) return;
    busy.current = true;
    setMessage(null);
    try {
      const reply = await saveRetentionAction(n);
      if (reply.ok) {
        setSaved(n);
        setMessage("저장했습니다.");
      } else setMessage("저장하지 못했습니다.");
    } catch {
      setMessage("저장하지 못했습니다.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={RETENTION_MIN}
          max={RETENTION_MAX}
          value={value}
          disabled={!editable}
          onChange={(event) => setValue(event.target.value)}
          aria-label="보관 기간(일)"
          className={`${inputClass} w-28`}
        />
        <span className="text-sm text-ink-2">일</span>
        {editable ? (
          <button type="button" onClick={save} disabled={!valid || n === saved} className={btnPrimary}>
            저장
          </button>
        ) : null}
      </div>
      {!valid ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {RETENTION_MIN}~{RETENTION_MAX}일 사이로 적어 주세요.
        </p>
      ) : null}
      {message ? <p className="text-xs text-ink-2">{message}</p> : null}
      {!editable ? <p className="text-xs text-ink-3">HR 관리자만 바꿀 수 있습니다.</p> : null}
    </div>
  );
}
