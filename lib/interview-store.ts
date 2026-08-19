import type { InterviewSession } from "@/lib/types";

/**
 * 진행 상태를 브라우저에 보관해, 창을 닫았다 다시 들어와도 이어서 진행할 수 있게 한다.
 * API 연결 단계에서 서버(Supabase) 저장으로 옮기고, 이 파일은 오프라인 대비 캐시로 남긴다.
 */
const listeners = new Set<() => void>();

function storageKey(token: string) {
  return `ai-interview:session:${token}`;
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeSession(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** useSyncExternalStore 의 스냅샷. 문자열이라 값이 같으면 다시 렌더하지 않는다. */
export function readSessionRaw(token: string) {
  return window.localStorage.getItem(storageKey(token));
}

export function parseSession(raw: string | null): InterviewSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InterviewSession;
    return Array.isArray(parsed?.messages) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: InterviewSession) {
  window.localStorage.setItem(storageKey(session.token), JSON.stringify(session));
  notify();
}

export function clearSession(token: string) {
  window.localStorage.removeItem(storageKey(token));
  notify();
}
