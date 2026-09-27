/**
 * 받아 적기(음성 → 글). 바깥 서비스와 이야기하는 곳은 이 파일 하나뿐이다.
 * 지금은 리턴제로(RTZR, openapi.vito.ai). 다른 서비스(CLOVA·자체 Whisper)로 바꿀 때는
 * 아래 네 가지(sttReady · sttSubmit · sttPoll · STT_VENDOR)만 같은 모양으로 다시 짜면 된다.
 *
 * 서버 전용. 키(RTZR_CLIENT_ID · RTZR_CLIENT_SECRET)는 .env.local / Vercel 에만 둔다.
 * RTZR_URL 은 로컬 가짜 서버로 시험할 때만 쓴다.
 */

import type { SttSegment } from "@/lib/types";

/** 동의 화면에 적는 받아 적기 처리 업체 */
export const STT_VENDOR = "(주)리턴제로";

export type SttSubmit =
  | { ok: true; job: string }
  /**
   * retry = 잠시 뒤 다시 보내면 될 수 있는 오류인지 (형식 거부 등은 false)
   * halt = 키가 틀렸거나 서비스에 닿지 않음 — 이 답변 탓이 아니므로 시도 횟수를 쓰지 않고 멈춘다
   */
  | { ok: false; reason: string; retry: boolean; halt?: boolean };

export type SttPoll =
  | { state: "running" }
  | { state: "done"; text: string; segments: SttSegment[] }
  | { state: "failed"; reason: string };

const base = () => (process.env.RTZR_URL || "https://openapi.vito.ai").replace(/\/$/, "");

export function sttReady() {
  return Boolean(process.env.RTZR_CLIENT_ID?.trim() && process.env.RTZR_CLIENT_SECRET?.trim());
}

/* 로그인 표(6시간 유효)는 서버가 켜져 있는 동안 기억해 두고, 만료 10분 전에 새로 받는다. */
let cached: { token: string; until: number } | null = null;

async function token(fresh = false) {
  if (!fresh && cached && cached.until > Date.now()) return cached.token;
  const res = await fetch(`${base()}/v1/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.RTZR_CLIENT_ID ?? "",
      client_secret: process.env.RTZR_CLIENT_SECRET ?? "",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    cached = null;
    throw new SttError(res.status === 401 ? "받아 적기 키가 맞지 않음" : `받아 적기 로그인 ${res.status}`);
  }
  const body = (await res.json()) as { access_token?: string; expire_at?: number };
  if (!body.access_token) throw new SttError("받아 적기 로그인 응답 이상");
  const until = body.expire_at ? body.expire_at * 1000 - 10 * 60_000 : Date.now() + 5 * 3600_000;
  cached = { token: body.access_token, until };
  return cached.token;
}

/** 로그인 실패 — 답변 탓이 아니다 */
class SttError extends Error {}

/** 표가 중간에 만료됐으면(401) 한 번만 새로 받아 다시 부른다. */
async function call(path: string, init: (auth: string) => RequestInit) {
  let res = await fetch(`${base()}${path}`, init(`bearer ${await token()}`));
  if (res.status === 401) res = await fetch(`${base()}${path}`, init(`bearer ${await token(true)}`));
  return res;
}

async function errorText(res: Response) {
  try {
    const body = (await res.json()) as { code?: string; msg?: string; message?: string };
    return [body.code, body.msg ?? body.message].filter(Boolean).join(" ").slice(0, 120);
  } catch {
    return "";
  }
}

/** 녹화 파일을 보내고 작업 번호를 받는다. 결과는 sttPoll 로 따로 받는다. */
export async function sttSubmit(file: Blob, filename: string): Promise<SttSubmit> {
  if (!sttReady()) return { ok: false, reason: "받아 적기 서비스 미연결", retry: true, halt: true };
  try {
    const res = await call("/v1/transcribe", (auth) => {
      const form = new FormData();
      form.append("file", file, filename);
      form.append(
        "config",
        JSON.stringify({
          model_name: "sommers",
          language: "ko",
          use_itn: true, // "삼 년" → "3년"
          use_disfluency_filter: true, // "음", "어" 같은 군말 빼기
          use_paragraph_splitter: true,
        })
      );
      return { method: "POST", headers: { Authorization: auth }, body: form, signal: AbortSignal.timeout(120_000) };
    });
    if (res.ok) {
      const body = (await res.json()) as { id?: string };
      if (body.id) return { ok: true, job: String(body.id) };
      return { ok: false, reason: "받아 적기 응답 이상", retry: true };
    }
    const detail = await errorText(res);
    // 401(표를 새로 받아도 거부)·429(한도)·5xx = 서비스 쪽 사정 → 멈췄다가 나중에
    if (res.status >= 500 || res.status === 429 || res.status === 401) {
      return { ok: false, reason: `받아 적기 서비스 ${res.status}${detail ? ` ${detail}` : ""}`, retry: true, halt: true };
    }
    // 그 밖의 4xx = 이 파일을 거부 → 다시 보내도 같다
    return { ok: false, reason: `받아 적기 거부 ${res.status}${detail ? ` ${detail}` : ""}`, retry: false };
  } catch (e) {
    if (e instanceof SttError) return { ok: false, reason: e.message, retry: true, halt: true };
    return { ok: false, reason: "받아 적기 서비스에 닿지 못함", retry: true, halt: true };
  }
}

type Utterance = { start_at?: number; duration?: number; msg?: string };

/** 작업 상태 확인. 끝났으면 전체 글과 토막별 시각을 돌려준다. */
export async function sttPoll(job: string): Promise<SttPoll> {
  try {
    const res = await call(`/v1/transcribe/${encodeURIComponent(job)}`, (auth) => ({
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(15_000),
    }));
    if (res.status === 404) return { state: "failed", reason: "받아 적기 작업을 찾지 못함" };
    if (!res.ok) return { state: "running" }; // 잠깐의 오류는 다음 확인 때 다시
    const body = (await res.json()) as {
      status?: string;
      results?: { utterances?: Utterance[] };
      error?: { code?: string; message?: string };
    };
    if (body.status === "completed") {
      const segments = (body.results?.utterances ?? [])
        .filter((u) => u.msg?.trim())
        .map((u) => {
          const s = (u.start_at ?? 0) / 1000;
          return {
            s: Math.round(s * 10) / 10,
            e: Math.round((s + (u.duration ?? 0) / 1000) * 10) / 10,
            t: u.msg!.trim(),
          };
        });
      return { state: "done", text: segments.map((x) => x.t).join(" "), segments };
    }
    if (body.status === "failed") {
      const why = [body.error?.code, body.error?.message].filter(Boolean).join(" ");
      return { state: "failed", reason: `받아 적기 실패${why ? ` ${why.slice(0, 100)}` : ""}` };
    }
    return { state: "running" };
  } catch {
    return { state: "running" };
  }
}
