import { isStoreConfigured } from "@/lib/db";
import { purgeExpired } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * 매일 한 번(vercel.json crons) — 보관 기간이 지난 기록과 10일 넘은 삭제 요청을 지운다.
 * Vercel 이 CRON_SECRET 을 Authorization: Bearer 로 붙여 부른다. 값이 없으면 아무도 못 부른다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!isStoreConfigured()) return Response.json({ ok: false, error: "store" }, { status: 503 });
  try {
    return Response.json({ ok: true, ...(await purgeExpired()) });
  } catch {
    return Response.json({ ok: false, error: "purge" }, { status: 500 });
  }
}
