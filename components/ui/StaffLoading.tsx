import { StaffFrame, type StaffNav } from "@/components/ui/StaffShell";

function Bar({ w, h = "h-4" }: { w: string; h?: string }) {
  return <span className={`block ${h} ${w} animate-pulse rounded bg-mute`} />;
}

/**
 * 담당자 화면을 옮길 때 서버 응답을 기다리는 동안 바로 보이는 틀.
 * 메뉴는 그대로 두고 본문 자리만 회색 막대로 채운다 — 눌렀는데 아무 반응이 없는 시간을 없앤다.
 */
export default function StaffLoading({
  current,
  kind = "table",
  rail = false,
}: {
  current: StaffNav;
  kind?: "table" | "review" | "form";
  rail?: boolean;
}) {
  return (
    <StaffFrame current={current} who="" rail={rail}>
      <main aria-busy="true" aria-label="불러오는 중" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-20 lg:px-8">
        <Bar w="w-40" h="h-7" />
        {kind === "review" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Bar key={i} w="w-full" h="h-12" />
              ))}
            </div>
            <Bar w="w-full" h="h-[360px]" />
          </div>
        ) : kind === "form" ? (
          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col gap-4">
              <Bar w="w-full" h="h-10" />
              <Bar w="w-full" h="h-32" />
              {[0, 1, 2].map((i) => (
                <Bar key={i} w="w-full" h="h-12" />
              ))}
            </div>
            <Bar w="w-full" h="h-72" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <Bar w="w-64" h="h-9" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Bar key={i} w="w-full" h="h-11" />
            ))}
          </div>
        )}
      </main>
    </StaffFrame>
  );
}
