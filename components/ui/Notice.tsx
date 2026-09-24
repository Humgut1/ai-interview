import Link from "next/link";
import { labelClass } from "@/components/ui/styles";

/** 저장소 미연결·링크 없음·기한 지남처럼 화면 대신 보여 줄 한 장짜리 안내 */
export default function Notice({
  label,
  title,
  body,
  home = false,
}: {
  label: string;
  title: string;
  body: string;
  /** 담당자 화면이면 대시보드로 돌아가는 링크를 붙인다. 후보자 화면에는 붙이지 않는다. */
  home?: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <p className={labelClass}>{label}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 leading-relaxed text-ink-2">{body}</p>
      {home ? (
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-ink-2 underline underline-offset-2 hover:text-ink">
          대시보드로
        </Link>
      ) : null}
    </main>
  );
}

export function StoreMissing() {
  return (
    <Notice
      label="저장소 연결 안 됨"
      title="데이터를 저장할 곳이 연결되지 않았습니다"
      body="서버 환경변수 SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 넣은 뒤 다시 열어 주세요."
      home
    />
  );
}
