import { timingSafeEqual } from "node:crypto";

/**
 * Hire 서버가 Screen 을 부를 때 쓰는 열쇠(SCREEN_API_TOKEN).
 * 같은 값을 Hire 서버 env 에도 넣는다. 브라우저로는 내려가지 않는다.
 */
export function hireTokenOk(req: Request): boolean {
  const want = process.env.SCREEN_API_TOKEN || "";
  const got = req.headers.get("x-screen-token") || "";
  if (want.length < 32 || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

/** Hire 쪽 id 모양 — 공고 p1, 후보자 c12 같은 짧은 글자만 받는다. */
export const hireIdOk = (v: unknown): v is string =>
  typeof v === "string" && /^[\w-]{1,40}$/.test(v);

/** 이 Screen 의 바깥 주소 — 링크를 만들 때 쓴다. 설정이 없으면 요청 주소에서. */
export function publicBase(req: Request): string {
  const env = (process.env.SCREEN_PUBLIC_URL || "").replace(/\/$/, "");
  return env || new URL(req.url).origin;
}
