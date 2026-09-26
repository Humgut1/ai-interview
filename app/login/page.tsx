import { redirect } from "next/navigation";
import { labelClass } from "@/components/ui/styles";
import { checkStaff } from "@/lib/auth/staff";

export const metadata = {
  title: "로그인 · AI 면접",
};

export const dynamic = "force-dynamic";

const WHY: Record<string, { title: string; body: string }> = {
  none: {
    title: "TalentCore 계정으로 로그인",
    body: "채용 담당자 화면입니다. 면접을 보는 후보자는 메일로 받은 링크로 들어가세요.",
  },
  out: { title: "로그아웃했습니다", body: "다시 들어가려면 TalentCore 계정으로 로그인하세요." },
  again: {
    title: "로그인을 다시 눌러 주세요",
    body: "로그인 요청이 오래됐거나 다른 창에서 시작됐습니다.",
  },
  fail: {
    title: "TalentCore 가 로그인을 확인하지 못했습니다",
    body: "잠시 뒤 다시 시도하세요. 계속되면 관리자에게 Screen 연결 설정을 확인해 달라고 하세요.",
  },
  off: {
    title: "로그인이 아직 연결되지 않았습니다",
    body: "관리자가 Screen 서버에 TalentCore 주소와 열쇠를 넣어야 합니다.",
  },
  pending: {
    title: "Hire 에서 승인을 기다리고 있습니다",
    body: "Screen 은 Hire 의 사용자 승인을 따릅니다. Hire 에 한 번 로그인한 뒤 HR 관리자에게 리크루터 역할을 요청하세요.",
  },
  role: {
    title: "채용 담당자만 들어올 수 있습니다",
    body: "하이어링 매니저·면접관은 AI 면접 결과를 Hire 후보자 상세에서 봅니다.",
  },
  offline: {
    title: "사용자 확인을 하지 못했습니다",
    body: "저장소에 연결하지 못했습니다. 잠시 뒤 다시 시도하세요.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ why?: string }>;
}) {
  const { why = "none" } = await searchParams;
  // 이미 들어올 수 있는 사람이면 바로 대시보드로
  if (why === "none" && (await checkStaff()).ok) redirect("/dashboard");
  const msg = WHY[why] ?? WHY.none;
  const signedIn = why === "pending" || why === "role";

  return (
    <main className="mx-auto w-full max-w-md px-5 py-20">
      <p className={labelClass}>Screen · AI 1차 면접</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{msg.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{msg.body}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {why !== "off" ? (
          <a
            href="/api/auth/core/start"
            className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:opacity-90"
          >
            {signedIn ? "다시 확인" : "TalentCore 계정으로 로그인"}
          </a>
        ) : null}
        {signedIn ? (
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas"
            >
              다른 계정으로
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
