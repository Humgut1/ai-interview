"use client";

/** 몇 개 중 하나 고르기 — 선택한 칸만 진하게. 색은 쓰지 않는다. */
export default function Seg<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full overflow-hidden rounded-md border border-line-strong"
    >
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={[
              "num h-9 shrink-0 whitespace-nowrap px-3.5 text-[13px] transition",
              index > 0 ? "border-l border-line-strong" : "",
              on ? "bg-ink font-semibold text-surface" : "bg-surface text-ink-2 hover:bg-canvas",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
