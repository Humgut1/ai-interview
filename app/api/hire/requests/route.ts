import { hireTokenOk, publicBase } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import { handleRequest, listRequests } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Hire '내 할 일' 이 읽어 가는 처리 안 된 후보자 요청 (서버끼리, SCREEN_API_TOKEN).
 * Hire 후보자에 붙은 면접의 요청만 준다. 메모는 300자까지.
 */
export async function GET(req: Request) {
  if (!hireTokenOk(req)) return Response.json({ ok: false, error: "token" }, { status: 401 });
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  const base = publicBase(req);
  const rows = await listRequests({ openOnly: true });
  return Response.json({
    ok: true,
    url: `${base}/requests`,
    requests: rows
      .filter((r) => r.hireCandidateId)
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        note: r.note.slice(0, 300),
        createdAt: r.createdAt,
        interviewId: r.interviewId,
        jobTitle: r.jobTitle,
        cid: r.hireCandidateId,
        pid: r.hirePositionId,
        submitted: r.submitted,
        purged: r.purged,
      })),
  });
}

/** Hire 서랍에서 [처리 완료] / [기록 삭제]. by = Hire 에 로그인한 담당자 이름. */
export async function POST(req: Request) {
  if (!hireTokenOk(req)) return Response.json({ ok: false, error: "token" }, { status: 401 });
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  let body: { id?: unknown; action?: unknown; by?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const { id, action, by } = body;
  if (typeof id !== "string" || !/^rq_[0-9a-f]{12}$/.test(id)) {
    return Response.json({ ok: false, error: "bad id" }, { status: 400 });
  }
  if (action !== "done" && action !== "delete") {
    return Response.json({ ok: false, error: "bad action" }, { status: 400 });
  }
  const who = typeof by === "string" && by.trim() ? `${by.trim().slice(0, 60)} (Hire)` : "Hire";
  const ok = await handleRequest(id, action, who);
  return Response.json({ ok }, { status: ok ? 200 : 404 });
}
