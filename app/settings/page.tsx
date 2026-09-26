import RetentionForm from "@/components/requests/RetentionForm";
import { StoreMissing } from "@/components/ui/Notice";
import TopBar from "@/components/ui/TopBar";
import { cardClass, labelClass } from "@/components/ui/styles";
import { requireStaff } from "@/lib/auth/staff";
import { isStoreConfigured } from "@/lib/db";
import { getRetentionDays } from "@/lib/store";

export const metadata = {
  title: "설정 · AI 면접",
};

export const dynamic = "force-dynamic";

/** 회사 설정. 지금은 면접 기록 보관 기간 하나(HR 관리자만 바꾼다). */
export default async function SettingsPage() {
  const staff = await requireStaff();
  if (!isStoreConfigured()) return <StoreMissing />;
  const days = await getRetentionDays();

  return (
    <div className="min-h-dvh">
      <TopBar current="설정" who={staff.name} />
      <main className="mx-auto w-full max-w-[720px] px-4 pb-20 lg:px-6">
        <div className="py-6">
          <p className={labelClass}>담당자 화면</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">설정</h1>
        </div>
        <section className={`${cardClass} px-5 py-4`}>
          <h2 className="text-sm font-semibold text-ink">면접 기록 보관 기간</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            제출일(제출하지 않았으면 링크 기한)로부터 이 기간이 지나면 답변·점수·검토 기록을
            자동으로 지웁니다. 후보자 동의 화면에 이 숫자가 그대로 안내됩니다. 기본 180일.
          </p>
          <RetentionForm initial={days} editable={staff.role === "admin"} />
        </section>
      </main>
    </div>
  );
}
