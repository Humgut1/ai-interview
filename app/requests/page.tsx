import RequestList from "@/components/requests/RequestList";
import { StoreMissing } from "@/components/ui/Notice";
import StaffShell from "@/components/ui/StaffShell";
import { requireStaff } from "@/lib/auth/staff";
import { hireBase } from "@/lib/candidates";
import { isStoreConfigured } from "@/lib/db";
import { listRequests, purgeExpired } from "@/lib/store";

export const metadata = {
  title: "후보자 요청 · Screen",
};

export const dynamic = "force-dynamic";

/** 후보자가 면접 링크에서 낸 요청(담당자 면접 · 결과 설명 · 기록 삭제). */
export default async function RequestsPage() {
  const staff = await requireStaff();
  if (!isStoreConfigured()) return <StoreMissing />;
  // 10일 넘은 삭제 요청은 여기서도 먼저 지운다(매일 한 번 도는 것과 같은 일).
  try {
    await purgeExpired();
  } catch {}
  const rows = await listRequests();

  return (
    <StaffShell current="requests" who={staff.name}>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 py-6">
          <h1 className="text-xl font-bold text-ink">후보자 요청</h1>
          <p className="text-[13px] text-ink-3">삭제 요청은 10일 안에 · 넘기면 자동 삭제</p>
        </div>
        <RequestList initial={rows} hireUrl={hireBase()} />
      </main>
    </StaffShell>
  );
}
