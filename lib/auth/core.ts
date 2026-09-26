/**
 * TalentCore 로 가는 문 (서버 전용). 담당자가 누구인지는 TalentCore 가 정한다.
 * 열쇠(CORE_API_TOKEN)는 브라우저로 내려보내지 않는다.
 */

const BASE = (process.env.CORE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.CORE_API_TOKEN || "";

export const coreUrl = () => BASE;
export const coreReady = () => !!(BASE && TOKEN);

/** TalentCore 가 준 로그인 표(2분)를 확인한다. 성공하면 표에 담긴 state 와 사람 id·이름. */
export async function verifyTicket(
  t: string
): Promise<{ state: string; id: string; name: string } | null> {
  if (!coreReady()) return null;
  try {
    const r = await fetch(`${BASE}/api/sso/verify`, {
      method: "POST",
      headers: { "X-API-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ t, app: "screen" }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      ok?: boolean;
      state?: string;
      user?: { id: string; name: string };
    };
    if (!j.ok || !j.user?.id || !j.state) return null;
    return { state: j.state, id: j.user.id, name: j.user.name };
  } catch {
    return null;
  }
}
