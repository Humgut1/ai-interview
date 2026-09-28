import Link from "next/link";
import type { ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";
import { openRequestCount } from "@/lib/store";

/** 담당자 화면 왼쪽 메뉴. 공고 → 후보자 → 면접 확인으로 들어가는 흐름이라 메뉴는 셋뿐이다. */
const NAV = [
  { key: "jobs", href: "/dashboard", label: "공고", icon: "M3 7h18v13H3zM9 7V5h6v2" },
  { key: "requests", href: "/requests", label: "후보자 요청", icon: "M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5" },
  { key: "settings", href: "/settings", label: "설정", icon: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" },
] as const;

export type StaffNav = (typeof NAV)[number]["key"];

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/**
 * 담당자 화면 틀. 넓은 화면은 왼쪽 메뉴(rail 이면 아이콘만), 좁은 화면은 위쪽 한 줄.
 * 후보자 요청 수는 여기서 직접 센다 — 어느 화면에서도 같은 숫자가 보이게.
 */
export default async function StaffShell({
  current,
  who,
  rail = false,
  children,
}: {
  current: StaffNav;
  who: string;
  /** 면접 확인처럼 가로 폭이 많이 필요한 화면은 아이콘 메뉴(64px) */
  rail?: boolean;
  children: ReactNode;
}) {
  let requests = 0;
  try {
    requests = await openRequestCount();
  } catch {}

  return (
    <div className="min-h-dvh bg-surface md:flex">
      <aside
        className={`sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b border-line bg-canvas px-3 md:h-dvh md:flex-col md:items-stretch md:border-r md:border-b-0 ${
          rail ? "h-14 md:w-16 md:items-center md:py-[18px]" : "h-14 md:w-[220px] md:px-3 md:py-[18px]"
        }`}
      >
        <Link
          href="/dashboard"
          className={`flex shrink-0 items-center gap-2 text-ink ${rail ? "px-1 md:mb-4" : "px-1 md:px-2 md:pb-5"}`}
          aria-label="Screen 공고 목록"
        >
          <BrandMark size={rail ? 22 : 20} />
          <span
            className={`text-sm ${rail ? "md:hidden" : ""}`}
            style={{ fontFamily: "var(--font-unbounded), sans-serif", fontWeight: 700 }}
          >
            screen
          </span>
        </Link>

        <nav className={`ml-auto flex items-center gap-1 md:ml-0 md:flex-col md:items-stretch ${rail ? "md:items-center" : ""}`}>
          {NAV.map((item) => {
            const on = item.key === current;
            const count = item.key === "requests" ? requests : 0;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={on ? "page" : undefined}
                aria-label={rail ? item.label : undefined}
                title={rail ? item.label : undefined}
                className={`relative flex h-9 items-center justify-between gap-2 rounded-md px-2.5 text-[13px] md:h-[38px] md:text-sm ${
                  on ? "bg-mute font-semibold text-ink" : "text-ink-2 hover:bg-mute hover:text-ink"
                } ${rail ? "md:h-11 md:w-11 md:justify-center md:px-0" : ""}`}
              >
                {rail ? (
                  <>
                    <span className="hidden md:block">
                      <Icon d={item.icon} />
                    </span>
                    <span className="md:hidden">{item.label}</span>
                  </>
                ) : (
                  <span>{item.label}</span>
                )}
                {count > 0 ? (
                  <span
                    className={`num text-xs font-semibold text-st-bad ${
                      rail ? "md:absolute md:top-1 md:right-1 md:text-[10px]" : ""
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <form
          action="/api/auth/logout"
          method="post"
          className={`flex shrink-0 items-center gap-2 md:mt-auto ${rail ? "md:flex-col" : "md:px-2.5 md:py-2"}`}
        >
          <span className={`hidden max-w-[9rem] truncate text-[13px] text-ink-2 ${rail ? "" : "md:inline"}`}>{who}</span>
          <button
            type="submit"
            className="text-[13px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
            title={rail ? `${who} · 로그아웃` : undefined}
          >
            로그아웃
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
