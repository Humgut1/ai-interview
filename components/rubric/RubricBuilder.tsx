"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
} from "react";
import QuestionEditor from "@/components/rubric/QuestionEditor";
import { Field, inputClass, textareaClass } from "@/components/ui/Field";
import { generateDraftQuestions, sampleJob } from "@/lib/mock/jobs";
import {
  clampWeight,
  createQuestion,
  estimateMinutes,
  moveQuestion,
  validateJob,
  weightPercents,
} from "@/lib/rubric";
import type { CriteriaLevel, Job, Question } from "@/lib/types";

const DRAFT_KEY = "ai-interview:job-draft";

/** 다른 탭에서 임시저장이 바뀌는 경우까지 감지한다. */
function subscribeDraft(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function hasContent(job: Job) {
  return (
    job.title.trim().length > 0 ||
    job.description.trim().length > 0 ||
    job.questions.some(
      (q) =>
        q.text.trim().length > 0 ||
        Object.values(q.criteria).some((value) => value.trim().length > 0)
    )
  );
}

export default function RubricBuilder({ initialJob }: { initialJob: Job }) {
  const [job, setJob] = useState<Job>(initialJob);
  const [showErrors, setShowErrors] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "warn"; text: string } | null>(
    null
  );
  const [draftDismissed, setDraftDismissed] = useState(false);

  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const validation = useMemo(() => validateJob(job), [job]);
  const minutes = estimateMinutes(job.questions);
  const percents = useMemo(() => weightPercents(job.questions), [job.questions]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 임시저장된 초안이 있으면 이어서 작성할지 물어본다.
  // 서버 렌더링 때는 값이 없으므로(null) 화면이 어긋나지 않는다.
  const draftRaw = useSyncExternalStore(
    subscribeDraft,
    () => window.localStorage.getItem(DRAFT_KEY),
    () => null
  );

  const savedDraft = useMemo(() => {
    if (!draftRaw || draftDismissed) return null;
    try {
      const parsed = JSON.parse(draftRaw) as Job;
      return parsed?.questions && hasContent(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [draftRaw, draftDismissed]);

  function patchQuestion(id: string, patch: Partial<Question>) {
    setJob((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              weight:
                patch.weight === undefined ? q.weight : clampWeight(patch.weight),
            }
          : q
      ),
    }));
  }

  function patchCriteria(id: string, level: CriteriaLevel, value: string) {
    setJob((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id ? { ...q, criteria: { ...q.criteria, [level]: value } } : q
      ),
    }));
  }

  function addQuestion() {
    setJob((prev) => ({ ...prev, questions: [...prev.questions, createQuestion()] }));
  }

  function removeQuestion(id: string) {
    setJob((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  }

  function reorder(from: number, to: number) {
    setJob((prev) => ({
      ...prev,
      questions: moveQuestion(prev.questions, from, to),
    }));
  }

  function resetDrag() {
    setArmedId(null);
    setDragIndex(null);
    setOverIndex(null);
  }

  async function handleGenerateDraft() {
    if (!job.description.trim()) {
      setShowErrors(true);
      setToast({
        tone: "warn",
        text: "직무 설명을 먼저 적어 주세요. 그 내용을 바탕으로 질문 초안을 만듭니다.",
      });
      return;
    }
    if (
      job.questions.some((q) => q.text.trim()) &&
      !window.confirm("지금 작성한 질문을 초안으로 교체할까요?")
    ) {
      return;
    }

    setGenerating(true);
    try {
      const questions = await generateDraftQuestions(job.description);
      setJob((prev) => ({ ...prev, questions }));
      setToast({
        tone: "ok",
        text: "초안을 만들었습니다. 회사 상황에 맞게 문장을 다듬어 주세요.",
      });
    } finally {
      setGenerating(false);
    }
  }

  function handleTempSave() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(job));
    setDraftDismissed(true);
    setToast({ tone: "ok", text: "임시저장했습니다. 이 브라우저에만 보관됩니다." });
  }

  function handleSave() {
    if (!validation.isValid) {
      setShowErrors(true);
      setToast({
        tone: "warn",
        text: `아직 채우지 않은 항목이 ${validation.errorCount}곳 있습니다.`,
      });
      return;
    }
    // API 연결 단계에서 Supabase 저장 API 로 교체된다.
    console.log("[rubric] 저장할 데이터", job);
    setToast({
      tone: "ok",
      text: "저장했습니다. (지금은 화면 확인용이라 실제 보관은 API 연결 단계에서 연결됩니다)",
    });
  }

  return (
    <div className="pb-28">
      {savedDraft ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-line bg-sand px-4 py-3 text-sm text-ink-2">
          <span>이전에 작성하던 내용이 있습니다.</span>
          <button
            type="button"
            onClick={() => {
              setJob(savedDraft);
              setDraftDismissed(true);
              setToast({ tone: "ok", text: "임시저장한 내용을 불러왔습니다." });
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            이어서 작성
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(DRAFT_KEY);
              setDraftDismissed(true);
            }}
            className="text-xs font-medium text-ink-2 underline underline-offset-2"
          >
            새로 시작
          </button>
        </div>
      ) : null}

      <section className="rounded-md border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-base font-semibold text-ink">직무 정보</h2>
        <p className="mt-1 text-sm text-ink-3">
          여기 적은 설명을 바탕으로 질문 초안을 만들 수 있습니다.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          <Field
            label="직무명"
            htmlFor="job-title"
            required
            error={showErrors ? validation.title : undefined}
          >
            <input
              id="job-title"
              value={job.title}
              onChange={(event) =>
                setJob((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="예: 백엔드 엔지니어 (경력 3년 이상)"
              className={inputClass}
            />
          </Field>

          <Field
            label="직무 설명"
            htmlFor="job-description"
            hint="맡을 업무와 중요하게 보는 역량을 적어 주세요."
          >
            <textarea
              id="job-description"
              rows={4}
              value={job.description}
              onChange={(event) =>
                setJob((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="예: 결제 도메인의 API 를 설계하고 운영합니다. 장애 대응 경험과 협업 커뮤니케이션을 중요하게 봅니다."
              className={textareaClass}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateDraft}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-accent-soft px-3.5 py-2 text-sm font-semibold text-accent hover:bg-accent-soft disabled:opacity-60"
            >
              {generating ? (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-blue-700"
                />
              ) : null}
              {generating ? "초안 만드는 중…" : "직무 설명으로 질문 초안 만들기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setJob({ ...sampleJob, id: job.id });
                setToast({ tone: "ok", text: "예시 내용을 채웠습니다." });
              }}
              className="text-xs font-medium text-ink-3 underline underline-offset-2 hover:text-ink-2"
            >
              예시로 채워보기
            </button>
            <p className="text-xs text-ink-3">
              초안은 그대로 쓰지 말고 반드시 사람이 검토·수정해 주세요.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            질문과 평가 기준
          </h2>
          <p className="text-sm text-ink-3">
            카드를 끌거나 ↑↓ 버튼으로 순서를 바꿀 수 있습니다.
          </p>
        </div>

        {showErrors && validation.questions ? (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {validation.questions}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-4">
          {job.questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              total={job.questions.length}
              percent={percents[question.id] ?? 0}
              errors={validation.byQuestion[question.id]}
              showErrors={showErrors}
              draggable={armedId === question.id}
              isDragging={dragIndex === index}
              isDropTarget={
                dragIndex !== null && overIndex === index && dragIndex !== index
              }
              onPatch={(patch) => patchQuestion(question.id, patch)}
              onCriteriaChange={(level, value) =>
                patchCriteria(question.id, level, value)
              }
              onRemove={() => removeQuestion(question.id)}
              onMove={(direction) => reorder(index, index + direction)}
              onHandleGrab={() => setArmedId(question.id)}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={resetDrag}
              onDragOver={(event: DragEvent<HTMLElement>) => {
                if (dragIndex === null) return;
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event: DragEvent<HTMLElement>) => {
                event.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                resetDrag();
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="mt-4 w-full rounded-md border border-dashed border-line-strong py-3.5 text-sm font-semibold text-ink-2 hover:border-accent hover:bg-accent-soft hover:text-accent"
        >
          + 질문 추가
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-3">
          <p className="text-sm text-ink-2">
            총 <strong className="text-ink">{job.questions.length}</strong>
            문항 · 예상 <strong className="text-ink">{minutes}</strong>분
            {validation.isValid ? null : (
              <span className="ml-2 text-rose-600">
                미입력 {validation.errorCount}곳
              </span>
            )}
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={handleTempSave}
              className="rounded-md border border-line-strong px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-canvas"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              저장
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className={[
            "fixed bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-md px-4 py-2.5 text-sm shadow-lg",
            toast.tone === "ok"
              ? "bg-ink text-white"
              : "bg-rose-600 text-white",
          ].join(" ")}
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
