import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 는 서버에서만 만진다. Hire 와 같은 프로젝트를 쓰고, Screen 표는 이름이 screen_ 으로 시작한다.
 * 표에 행 보안(RLS)을 켜고 정책을 두지 않았으므로 service_role 열쇠로만 읽고 쓸 수 있다.
 * 그래서 이 값들은 NEXT_PUBLIC_ 이름을 쓰지 않는다 — 브라우저로 내려가면 안 된다.
 * 이 파일은 서버 컴포넌트·서버 함수에서만 import 한다.
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isStoreConfigured() {
  return Boolean(url && key);
}

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!url || !key) {
    throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있지 않습니다.");
  }
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
