import Link from "next/link";

const steps = [
  { label: "SC1 서버 저장 (Supabase)", done: true, href: "/dashboard" },
  { label: "SC2 채점 AI", done: false },
  { label: "SC3 후속 질문 AI", done: false },
  { label: "SC4 TalentCore 로그인 · Hire 연결", done: false },
  { label: "SC5 배포 · 한 바퀴", done: false },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-ink">AI 면접 도구</h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        미리 정한 평가 기준에 따라 1차 면접을 진행하고, 점수와 그렇게 판단한
        근거를 정리해 줍니다. 합격 여부를 정하는 것은 언제나 사람입니다.
      </p>

      <Link
        href="/dashboard"
        className="mt-8 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        대시보드 열기
      </Link>

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-ink">진행 상황</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {steps.map((step) => (
            <li
              key={step.label}
              className="flex items-center gap-2 text-sm text-ink-2"
            >
              <span
                aria-hidden
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  step.done
                    ? "bg-accent-soft text-accent"
                    : "bg-mute text-ink-3"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              {step.href ? (
                <Link href={step.href} className="underline underline-offset-2">
                  {step.label}
                </Link>
              ) : (
                step.label
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
