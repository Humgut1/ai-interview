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
          질문 <strong className="text-ink">{current}</strong> / {total}
        </span>
        <span>{percent}% 진행</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="면접 진행률"
        className="h-1.5 w-full overflow-hidden rounded-full bg-mute"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
