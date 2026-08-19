import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export const textareaClass = `${inputClass} resize-y leading-relaxed`;

export const errorInputClass =
  "border-rose-400 focus:border-rose-500 focus:ring-rose-100";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-sm font-medium text-slate-800"
      >
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
        {hint ? (
          <span className="text-xs font-normal text-slate-500">{hint}</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
