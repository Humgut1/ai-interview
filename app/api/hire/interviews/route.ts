import { hireIdOk, hireTokenOk, publicBase } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import {
  interviewsForHireCandidate,
  issueInterview,
  jobForHirePosition,
} from "@/lib/store";

/**
 * Hire [AI 1차 면접 보내기] → 면접 한 건과 링크 (서버끼리, SCREEN_API_TOKEN).
 * 그 공고에 질문 묶음이 없으면 만들 곳 주소만 돌려준다.
 * 아직 유효한 링크가 있으면 새로 만들지 않고 그 링크를 돌려준다(두 번 눌러도 한 건).
 */
export async function POST(req: Request) {
  if (!hireTokenOk(req)) return Response.json({ ok: false, error: "token" }, { status: 401 });
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  let body: { cid?: unknown; pid?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const { cid, pid } = body;
  if (!hireIdOk(cid) || !hireIdOk(pid)) {
    return Response.json({ ok: false, error: "bad id" }, { status: 400 });
  }
  const base = publicBase(req);
  const job = await jobForHirePosition(pid);
  if (!job) {
    return Response.json(
      { ok: false, error: "no-job", createUrl: `${base}/jobs/new?hire=${encodeURIComponent(pid)}` },
      { status: 409 }
    );
  }
  if (job.status !== "진행중") {
    return Response.json({ ok: false, error: "closed" }, { status: 409 });
  }

  const open = (await interviewsForHireCandidate(cid)).find(
    (iv) => iv.jobId === job.id && iv.stage !== "제출완료" && !iv.expired
  );
  if (open) {
    return Response.json({
      ok: true,
      reused: true,
      id: open.id,
      link: `${base}/interview/${open.token}`,
      expiresAt: open.expiresAt,
    });
  }

  const created = await issueInterview(job.id, cid);
  const fresh = (await interviewsForHireCandidate(cid)).find((iv) => iv.id === created.id);
  return Response.json(
    {
      ok: true,
      reused: false,
      id: created.id,
      link: `${base}/interview/${created.token}`,
      expiresAt: fresh?.expiresAt ?? null,
    },
    { status: 201 }
  );
}
