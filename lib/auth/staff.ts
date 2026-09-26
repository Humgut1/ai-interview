import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, isStoreConfigured } from "@/lib/db";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";

/**
 * 담당자 확인 — 담당자 화면·서버 함수·API 의 첫 줄에서 부른다.
 *
 * 누구인지 = TalentCore 로그인(쿠키). 들어갈 수 있는지 = Hire 사용자 표(app_users).
 * Screen 에 계정 표를 따로 두지 않는다. Hire 에서 HR 관리자·리크루터로 승인된 사람만 들어온다.
 * 하이어링 매니저·면접관은 결과를 Hire 후보자 상세의 요약으로 본다.
 */

export interface Staff {
  /** 'core:<테넌트>:<사용자>' */
  id: string;
  name: string;
  role: "admin" | "recruiter";
}

export type StaffCheck =
  | { ok: true; staff: Staff }
  | { ok: false; why: "none" | "pending" | "role" | "offline" };

const ROLES = ["admin", "recruiter"] as const;

export async function checkStaff(): Promise<StaffCheck> {
  const jar = await cookies();
  const s = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return { ok: false, why: "none" };
  if (!isStoreConfigured()) return { ok: false, why: "offline" };
  try {
    const { data, error } = await db()
      .from("app_users")
      .select("id, nm, role, st")
      .eq("id", s.u)
      .maybeSingle();
    if (error) return { ok: false, why: "offline" };
    if (!data || data.st !== "active") return { ok: false, why: "pending" };
    if (!ROLES.includes(data.role)) return { ok: false, why: "role" };
    return { ok: true, staff: { id: s.u, name: data.nm || s.n, role: data.role } };
  } catch {
    return { ok: false, why: "offline" };
  }
}

/** 화면용 — 안 되면 로그인 화면으로 보낸다. */
export async function requireStaff(): Promise<Staff> {
  const c = await checkStaff();
  if (!c.ok) redirect(`/login?why=${c.why}`);
  return c.staff;
}

/** 서버 함수·API 용 — 안 되면 null. 호출한 쪽이 거절한다. */
export async function staffOrNull(): Promise<Staff | null> {
  const c = await checkStaff();
  return c.ok ? c.staff : null;
}
