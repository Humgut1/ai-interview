import { hireIdOk, hireTokenOk, publicBase } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import { interviewsForHireCandidate, jobForHirePosition } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Hire 후보자 상세가 읽어 가는 요약 (서버끼리, SCREEN_API_TOKEN).
 * 점수·검토 상태·리포트 주소만 준다. 대화 원문과 평가 기준은 주지 않는다 — 보려면 Screen 에 로그인한다.
 */
export async function GET(req: Request) {
  if (!hireTokenOk(req)) return Response.json({ ok: false, error: "token" }, { status: 401 });
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  const q = new URL(req.url).searchParams;
  const cid = q.get("cid");
  const pid = q.get("pid");
  if (!hireIdOk(cid) || !hireIdOk(pid)) {
    return Response.json({ ok: false, error: "bad id" }, { status: 400 });
  }
  const base = publicBase(req);
  const [job, interviews] = await Promise.all([
    jobForHirePosition(pid),
    interviewsForHireCandidate(cid),
  ]);
  return Response.json({
    ok: true,
    job: job ? { ...job, url: `${base}/jobs/${job.id}/candidates` } : null,
    createUrl: `${base}/jobs/new?hire=${encodeURIComponent(pid)}`,
    interviews: interviews.map(({ token, ...iv }) => ({
      ...iv,
      link: `${base}/interview/${token}`,
      reportUrl: iv.stage === "제출완료" ? `${base}/interviews/${iv.id}` : null,
    })),
  });
}
