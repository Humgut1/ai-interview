import Link from "next/link";
import { inputClass } from "@/components/ui/Field";
import {
  barFillClass,
  barTrackClass,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardClass,
  evidenceClass,
  labelClass,
  panelClass,
} from "@/components/ui/styles";
import { CRITERIA_META } from "@/lib/types";

export const metadata = {
  title: "스타일 가이드 · AI 면접",
};

/** 실제 화면에서 쓰는 색. 이름과 쓰임새를 함께 적어 둔다. */
const COLORS = [
  { name: "canvas", use: "페이지 바탕", swatch: "bg-canvas" },
  { name: "surface", use: "카드 바탕", swatch: "bg-surface" },
  { name: "sand", use: "읽기만 하는 영역", swatch: "bg-sand" },
  { name: "mute", use: "막대 바탕, 옅은 배지", swatch: "bg-mute" },
  { name: "line", use: "칸을 나누는 선", swatch: "bg-line" },
  { name: "line-strong", use: "입력칸 테두리", swatch: "bg-line-strong" },
  { name: "ink", use: "본문 글자", swatch: "bg-ink" },
  { name: "ink-2", use: "보조 설명", swatch: "bg-ink-2" },
  { name: "ink-3", use: "부가 정보, 비활성", swatch: "bg-ink-3" },
  { name: "accent", use: "가장 중요한 동작 하나", swatch: "bg-accent" },
  { name: "accent-soft", use: "근거 강조, 선택된 줄", swatch: "bg-accent-soft" },
  { name: "bar", use: "점수 막대", swatch: "bg-bar" },
];

const RULES = [
  {
    title: "점수 옆에는 항상 근거가 있다",
    body: "숫자만 보이는 화면은 만들지 않습니다. 점수 아래에는 그렇게 판단한 이유와, 후보자가 실제로 한 말이 함께 나옵니다.",
  },
  {
    title: "등급에 신호등 색을 쓰지 않는다",
    body: "초록·노랑·빨강을 쓰면 색만 보고 합불을 정하게 됩니다. 단계는 글자 진하기로만 구분하고, 점수 막대는 점수가 높든 낮든 같은 색입니다.",
  },
  {
    title: "후보자를 점수순으로 줄 세우지 않는다",
    body: "목록은 지원한 순서로 놓습니다. 위에 있는 사람이 더 나은 사람처럼 보이지 않게 하기 위해서입니다.",
  },
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * 화면에 쓰는 색·글자·버튼을 한 장에 모아 둔 스타일 가이드.
 * 새 화면을 만들 때 여기 있는 것만 골라 쓰면 생김새가 어긋나지 않는다.
 */
export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-14">
      <header>
        <p className={labelClass}>스타일 가이드</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          이 도구의 화면 규칙
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
          색과 글자, 버튼을 한 곳에 모아 둔 페이지입니다. 새 화면을 만들 때는
          여기 있는 것만 골라 씁니다. 값을 바꾸려면{" "}
          <code className="num rounded-sm bg-mute px-1 text-[13px]">
            app/globals.css
          </code>{" "}
          한 곳만 고치면 모든 화면이 함께 바뀝니다.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-accent underline underline-offset-2"
        >
          ← 처음 화면으로
        </Link>
      </header>

      <Section title="색" hint="이름은 색깔이 아니라 쓰임새로 지었습니다.">
        <ul className={`${cardClass} grid grid-cols-1 sm:grid-cols-2`}>
          {COLORS.map((color, index) => (
            <li
              key={color.name}
              className={`flex items-center gap-3 px-4 py-3 ${
                index % 2 === 0 ? "sm:border-r sm:border-line" : ""
              } border-b border-line last:border-b-0`}
            >
              <span
                aria-hidden
                className={`h-8 w-8 shrink-0 rounded-md border border-line ${color.swatch}`}
              />
              <span className="num text-[13px] text-ink">{color.name}</span>
              <span className="ml-auto text-right text-xs text-ink-3">
                {color.use}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="글자"
        hint="본문은 읽기 좋은 크기로, 숫자는 자리가 흔들리지 않는 서체로 씁니다."
      >
        <div className={`${cardClass} flex flex-col divide-y divide-line`}>
          <div className="px-5 py-4">
            <p className={labelClass}>화면 제목</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
              면접 결과 검토
            </p>
          </div>
          <div className="px-5 py-4">
            <p className={labelClass}>본문</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
              점수는 참고용입니다. 합격 여부는 담당자가 정합니다.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className={labelClass}>보조 설명</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
              점수를 고쳤다면 그 이유를 남겨 주세요.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className={labelClass}>숫자</p>
            <p className="num mt-1.5 text-3xl text-ink">88 / 100</p>
          </div>
        </div>
      </Section>

      <Section
        title="버튼"
        hint="한 화면에 진한 버튼은 하나만 둡니다. 제일 중요한 동작 하나."
      >
        <div className={`${cardClass} flex flex-wrap items-center gap-3 p-5`}>
          <button type="button" className={btnPrimary}>
            검토 내용 저장
          </button>
          <button type="button" className={btnSecondary}>
            대화 전문 보기
          </button>
          <button type="button" className={btnGhost}>
            되돌리기
          </button>
          <button type="button" className={btnPrimary} disabled>
            누를 수 없음
          </button>
        </div>
      </Section>

      <Section title="입력칸">
        <div className={`${cardClass} flex flex-col gap-3 p-5`}>
          <input
            className={inputClass}
            placeholder="예) 백엔드 엔지니어 (경력 3년 이상)"
            aria-label="입력 예시"
          />
          <textarea
            rows={2}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="면접에서 확인하고 싶은 점을 적어 두세요."
            aria-label="여러 줄 입력 예시"
          />
        </div>
      </Section>

      <Section
        title="점수 표시"
        hint="점수 막대는 몇 점이든 같은 색입니다. 색으로 합불을 알려 주지 않습니다."
      >
        <div className={`${cardClass} p-5`}>
          <div className="flex items-baseline gap-2">
            <span className="num text-4xl font-medium text-ink">88</span>
            <span className="text-sm text-ink-3">/ 100</span>
          </div>
          <div className={`${barTrackClass} mt-3`}>
            <div className={barFillClass} style={{ width: "88%" }} />
          </div>

          <p className={`${labelClass} mt-5`}>등급 표시</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CRITERIA_META.map((meta) => (
              <span
                key={meta.key}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.accent}`}
              >
                {meta.label}
              </span>
            ))}
          </div>

          <p className={`${labelClass} mt-5`}>근거로 인용된 문장</p>
          <p className={`${panelClass} mt-2 px-4 py-3 text-sm leading-relaxed text-ink`}>
            대시보드에서{" "}
            <span className={evidenceClass}>
              p95 응답시간이 평소 400ms 에서 1.8초까지 올라간 걸
            </span>{" "}
            보고 원인을 좁혔습니다.
          </p>
        </div>
      </Section>

      <Section title="지키기로 한 것" hint="생김새보다 먼저 정한 규칙입니다.">
        <ol className={`${cardClass} flex flex-col divide-y divide-line`}>
          {RULES.map((rule, index) => (
            <li key={rule.title} className="flex gap-4 px-5 py-4">
              <span aria-hidden className="num shrink-0 text-xs text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{rule.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {rule.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
