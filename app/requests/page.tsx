import RequestList from "@/components/requests/RequestList";
import { StoreMissing } from "@/components/ui/Notice";
import TopBar from "@/components/ui/TopBar";
import { labelClass } from "@/components/ui/styles";
import { requireStaff } from "@/lib/auth/staff";
import { isStoreConfigured } from "@/lib/db";
import { listRequests, purgeExpired } from "@/lib/store";

export const metadata = {
  title: "후보자 요청 · AI 면접",
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
    <div className="min-h-dvh">
      <TopBar current="후보자 요청" who={staff.name} />
      <main className="mx-auto w-full max-w-[900px] px-4 pb-20 lg:px-6">
        <div className="py-6">
          <p className={labelClass}>담당자 화면</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">후보자 요청</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            삭제 요청은 10일 안에 처리합니다. 넘기면 자동으로 지웁니다.
          </p>
        </div>
        <RequestList initial={rows} />
      </main>
    </div>
  );
}
