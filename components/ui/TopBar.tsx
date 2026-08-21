import Link from "next/link";
import type { ReactNode } from "react";

/** 화면 위쪽에 늘 같은 자리로 붙는 머리띠. 어느 화면에서도 길을 잃지 않게 한다. */
const NAV = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/jobs/new", label: "새 직무" },
  { href: "/design", label: "스타일 가이드" },
];

export default function TopBar({
  current,
  right,
}: {
  /** 지금 보고 있는 화면 이름. 로고 옆에 흐리게 적는다. */
  current?: string;
  /** 오른쪽 끝에 놓을 버튼 (화면마다 다르다) */
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-6 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-md bg-ink"
          >
            <span className="block h-0.5 w-3 bg-white" />
          </span>
          <span className="text-sm font-semibold text-ink">AI 면접 도구</span>
        </Link>

        {current ? (
          <span className="hidden text-sm text-ink-3 sm:inline">{current}</span>
        ) : null}

        <nav className="ml-auto hidden items-center gap-4 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] text-ink-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {right ? (
          <div className="ml-auto flex items-center gap-2 md:ml-0">{right}</div>
        ) : null}
      </div>
    </header>
  );
}
