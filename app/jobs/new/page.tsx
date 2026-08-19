import Link from "next/link";
import RubricBuilder from "@/components/rubric/RubricBuilder";
import { createEmptyJob } from "@/lib/rubric";

export const metadata = {
  title: "새 직무 만들기 · AI 면접",
};

export default function NewJobPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <nav className="text-sm text-ink-3">
        <Link href="/" className="hover:text-ink">
          홈
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">새 직무</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-ink">
          직무와 평가 기준 만들기
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          여기서 만든 기준(rubric)대로만 AI 가 답변을 채점합니다. 점수와 근거를
          정리해 줄 뿐, 합격 여부는 사람이 정합니다.
        </p>
      </header>

      <div className="mt-8">
        <RubricBuilder initialJob={createEmptyJob()} />
      </div>
    </main>
  );
}
