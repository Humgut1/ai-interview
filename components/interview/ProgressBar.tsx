import { barFillClass, barTrackClass } from "@/components/ui/styles";

export default function ProgressBar({
  current,
  total,
  percent,
}: {
  current: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs text-ink-2">
        <span>
          질문 <strong className="num text-ink">{current}</strong>
          <span className="num"> / {total}</span>
        </span>
        <span className="num">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="면접 진행률"
        className={barTrackClass}
      >
        <div
          className={`${barFillClass} transition-[width] duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
