import { hireIdOk, hireTokenOk } from "@/lib/auth/hire-token";
import { isStoreConfigured } from "@/lib/db";
import { HIRE_VIDEO_SEC, answersForHire } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Hire [영상 보기] (서버끼리, SCREEN_API_TOKEN) — SC8.
 * 그 후보자를 볼 수 있는지는 Hire 가 먼저 확인한다. 여기서는 면접이 그 후보자 것인지만 본다.
 * 영상 주소는 잠깐만 열린다(HIRE_VIDEO_SEC). 평가 기준·점수는 주지 않는다.
 */
export async function GET(req: Request) {
  if (!hireTokenOk(req)) return Response.json({ ok: false, error: "token" }, { status: 401 });
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  const q = new URL(req.url).searchParams;
  const cid = q.get("cid");
  const iv = q.get("iv");
  if (!hireIdOk(cid) || !iv || !/^iv_[0-9a-f]{12}$/.test(iv)) {
    return Response.json({ ok: false, error: "bad id" }, { status: 400 });
  }
  const answers = await answersForHire(cid, iv);
  if (!answers) return Response.json({ ok: false, error: "missing" }, { status: 404 });
  return Response.json(
    { ok: true, expiresInSec: HIRE_VIDEO_SEC, ...answers },
    { headers: { "Cache-Control": "no-store" } }
  );
}
