"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import QuestionEditor from "@/components/rubric/QuestionEditor";
import { saveJobAction } from "@/app/actions";
import { errorInputClass, inputClass, textareaClass } from "@/components/ui/Field";
import Seg from "@/components/ui/Seg";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { sampleJob } from "@/lib/mock/jobs";
import {
  clampWeight,
  createQuestion,
  estimateMinutes,
  moveQuestion,
  validateJob,
  weightPercents,
} from "@/lib/rubric";
import {
  ANSWER_SEC_CHOICES,
  CRITERIA_META,
  PREP_SEC_CHOICES,
  RETAKE_CHOICES,
  cleanVideoRules,
  type CriteriaLevel,
  type Job,
  type Question,
  type VideoRules,
} from "@/lib/types";

function secLabel(sec: number) {
  return sec % 60 === 0 ? `${sec / 60}분` : sec > 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
}

const DRAFT_KEY = "ai-interview:job-draft";

/** /api/questions/draft 가 돌려주는 모양 */
type DraftResponse =
  | { ok: true; source: "ai" | "sample"; questions: Question[]; notice?: string }
  | { ok: false; reason: string };

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

/** 저장 전 확인 카드의 빈칸 목록 — 누르면 그 질문을 펼친다. */
function blanks(job: Job): { id?: string; text: string }[] {
  const out: { id?: string; text: string }[] = [];
  if (!job.title.trim()) out.push({ text: "공고 이름 빈칸" });
  if (!job.questions.length) out.push({ text: "질문 없음" });
  job.questions.forEach((q, index) => {
    if (!q.text.trim()) out.push({ id: q.id, text: `질문 ${index + 1} 문장 빈칸` });
    const empty = CRITERIA_META.filter((meta) => !q.criteria[meta.key].trim()).length;
    if (empty) out.push({ id: q.id, text: `질문 ${index + 1} 평가 기준 빈칸 ${empty}` });
  });
  return out;
}

const settingLabel = "mb-1.5 text-[13px] font-semibold text-ink";
const settingHint = "mt-1 text-xs text-ink-3";

export default function RubricBuilder({
  initialJob,
  hirePositionId,
  hireTitle,
  hireLine,
  linkDays,
}: {
  initialJob: Job;
  /** Hire 공고에서 넘어왔으면 그 공고 id — 저장할 때 같이 적어 Hire 가 이 질문 묶음을 찾게 한다. */
  hirePositionId?: string;
  hireTitle?: string;
  /** 맨 위 Hire 연결 줄 (서버에서 만든다) */
  hireLine?: ReactNode;
  /** 링크 마감 — 보낸 날부터 며칠 (공고마다 바꾸지 않는다) */
  linkDays: number;
}) {
  const [job, setJob] = useState<Job>(initialJob);
  const [showErrors, setShowErrors] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [toast, setToast] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialJob.questions.slice(0, 1).map((q) => q.id))
  );

  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const validation = useMemo(() => validateJob(job), [job]);
  const blankList = useMemo(() => blanks(job), [job]);
  const minutes = estimateMinutes(job.questions, job.mode, job.video);
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
      if (!parsed?.questions || !hasContent(parsed)) return null;
      // 영상 면접 전에 임시저장한 초안에는 면접 방식이 없다
      return {
        ...parsed,
        mode: parsed.mode === "text" ? "text" : "video",
        video: cleanVideoRules(parsed.video),
      } as Job;
    } catch {
      return null;
    }
  }, [draftRaw, draftDismissed]);

  function openOnly(questions: Question[]) {
    setOpenIds(new Set(questions.slice(0, 1).map((q) => q.id)));
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpTo(id?: string) {
    setShowErrors(true);
    if (!id) {
      document.getElementById("job-title")?.focus();
      return;
    }
    setOpenIds((prev) => new Set(prev).add(id));
    setTimeout(() => document.getElementById(`q-${id}`)?.scrollIntoView({ block: "start" }), 0);
  }

  function patchVideo(patch: Partial<VideoRules>) {
    setJob((prev) => ({ ...prev, video: { ...prev.video, ...patch } }));
  }

  function patchQuestion(id: string, patch: Partial<Question>) {
    setJob((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              weight: patch.weight === undefined ? q.weight : clampWeight(patch.weight),
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
    const question = createQuestion();
    setJob((prev) => ({ ...prev, questions: [...prev.questions, question] }));
    setOpenIds((prev) => new Set(prev).add(question.id));
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
      setToast({ tone: "warn", text: "직무 설명을 먼저 적어 주세요" });
      document.getElementById("job-description")?.focus();
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
      // 키는 서버에만 있으므로, 브라우저는 우리 서버에 부탁만 한다.
      const response = await fetch("/api/questions/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          description: job.description,
        }),
      });
      const data = (await response.json()) as DraftResponse;

      if (!data.ok) {
        setToast({ tone: "warn", text: data.reason });
        return;
      }

      setJob((prev) => ({ ...prev, questions: data.questions }));
      openOnly(data.questions);
      setToast(
        data.source === "ai"
          ? { tone: "ok", text: "초안을 만들었습니다 · 문장을 검토해 주세요" }
          : { tone: "warn", text: data.notice ?? "예시 초안을 넣었습니다" }
      );
    } catch {
      setToast({ tone: "warn", text: "초안을 만들지 못했습니다 · 잠시 뒤 다시" });
    } finally {
      setGenerating(false);
    }
  }

  function handleTempSave() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(job));
    setDraftDismissed(true);
    setToast({ tone: "ok", text: "임시저장 · 이 브라우저에만 보관" });
  }

  async function handleSave() {
    if (saving) return;
    if (!validation.isValid) {
      setShowErrors(true);
      setToast({ tone: "warn", text: `빈칸 ${validation.errorCount}곳` });
      jumpTo(blankList[0]?.id);
      return;
    }
    setSaving(true);
    const result = await saveJobAction(job, hirePositionId);
    if (!result.ok) {
      setSaving(false);
      setToast({ tone: "warn", text: result.reason });
      return;
    }
    window.localStorage.removeItem(DRAFT_KEY);
    router.push(`/jobs/${result.id}/candidates`);
  }

  const video = job.mode === "video";
  const shownBlanks = blankList.slice(0, 4);

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">
        {hireLine}

        {savedDraft ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-sand px-4 py-3 text-sm text-ink-2">
            <span>임시저장한 내용 있음</span>
            <button
              type="button"
              onClick={() => {
                setJob(savedDraft);
                openOnly(savedDraft.questions);
                setDraftDismissed(true);
                setToast({ tone: "ok", text: "임시저장한 내용을 불러왔습니다" });
              }}
              className={`${btnSecondary} h-8 px-3 py-0 text-[13px]`}
            >
              이어서 작성
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(DRAFT_KEY);
                setDraftDismissed(true);
              }}
              className="text-[13px] text-ink-2 underline underline-offset-2"
            >
              새로 시작
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="job-title" className={`block ${settingLabel}`}>
              공고 이름
            </label>
            <input
              id="job-title"
              value={job.title}
              onChange={(event) => setJob((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="예: 백엔드 개발자"
              className={`${inputClass} ${showErrors && validation.title ? errorInputClass : ""}`}
            />
          </div>
          <div>
            <label htmlFor="job-description" className={`block ${settingLabel}`}>
              직무 설명 <span className="font-normal text-ink-3">· 질문 초안 재료 · 후보자에게 안 보임</span>
            </label>
            <textarea
              id="job-description"
              rows={3}
              value={job.description}
              onChange={(event) => setJob((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="맡을 업무와 중요하게 보는 역량"
              className={textareaClass}
            />
          </div>
        </div>

        <section className="border-t border-line pt-5">
          <h2 className="mb-3.5 text-[15px] font-semibold text-ink">면접 방식</h2>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className={settingLabel}>면접 방식</p>
              <Seg
                label="면접 방식"
                value={job.mode}
                options={[
                  { value: "video", label: "영상" },
                  { value: "text", label: "글" },
                ]}
                onChange={(mode) => setJob((prev) => ({ ...prev, mode }))}
              />
              <p className={settingHint}>{video ? "말한 내용만 평가 · 얼굴·말투 안 봄" : "채팅으로 답변 작성"}</p>
            </div>
            {video ? (
              <>
                <div className="min-w-0">
                  <p className={settingLabel}>연습 질문</p>
                  <Seg
                    label="연습 질문"
                    value={job.video.practice}
                    options={[
                      { value: true, label: "켬" },
                      { value: false, label: "끔" },
                    ]}
                    onChange={(practice) => patchVideo({ practice })}
                  />
                  <p className={settingHint}>저장 안 됨 · 담당자에게 안 보냄</p>
                </div>
                <div className="min-w-0">
                  <p className={settingLabel}>준비 시간</p>
                  <Seg
                    label="준비 시간"
                    value={job.video.prepSec}
                    options={PREP_SEC_CHOICES.map((sec) => ({ value: sec, label: secLabel(sec) }))}
                    onChange={(prepSec) => patchVideo({ prepSec })}
                  />
                </div>
                <div className="min-w-0">
                  <p className={settingLabel}>답변 시간</p>
                  <Seg
                    label="답변 시간"
                    value={job.video.answerSec}
                    options={ANSWER_SEC_CHOICES.map((sec) => ({ value: sec, label: secLabel(sec) }))}
                    onChange={(answerSec) => patchVideo({ answerSec })}
                  />
                </div>
                <div className="min-w-0">
                  <p className={settingLabel}>다시 찍기</p>
                  <Seg
                    label="다시 찍기"
                    value={job.video.retakes}
                    options={RETAKE_CHOICES.map((n) => ({ value: n, label: n === 0 ? "없음" : `${n}번` }))}
                    onChange={(retakes) => patchVideo({ retakes })}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="num text-[15px] font-semibold text-ink">질문 {job.questions.length}</h2>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={handleGenerateDraft} disabled={generating} className={btnSecondary}>
                {generating ? "초안 만드는 중 · 20초쯤" : "직무 설명으로 초안"}
              </button>
              <button type="button" onClick={addQuestion} className={btnSecondary}>
                질문 추가
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {job.questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                total={job.questions.length}
                percent={percents[question.id] ?? 0}
                open={openIds.has(question.id)}
                errors={validation.byQuestion[question.id]}
                showErrors={showErrors}
                draggable={armedId === question.id}
                isDragging={dragIndex === index}
                isDropTarget={dragIndex !== null && overIndex === index && dragIndex !== index}
                onToggle={() => toggle(question.id)}
                onPatch={(patch) => patchQuestion(question.id, patch)}
                onCriteriaChange={(level, value) => patchCriteria(question.id, level, value)}
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
            {job.questions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">
                질문 없음
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="self-start rounded-lg border border-line bg-surface px-[18px] pb-5 pt-[18px] lg:sticky lg:top-6">
        <h2 className="text-sm font-semibold text-ink">저장 전 확인</h2>
        <dl className="mt-1 text-[13px]">
          {(
            [
              ["면접 방식", video ? `영상 · 연습 ${job.video.practice ? "켬" : "끔"}` : "글"],
              ["질문", `${job.questions.length}개`],
              ["예상 시간", `약 ${minutes}분`],
              ["비중", job.questions.length ? job.questions.map((q) => percents[q.id] ?? 0).join(" · ") + "%" : "-"],
              ["링크 마감", `보낸 날부터 ${linkDays}일`],
              ["Hire", hireTitle || "연결 없음"],
            ] as [string, string][]
          ).map(([term, desc], index) => (
            <div
              key={term}
              className={`flex justify-between gap-3 py-[9px] ${index ? "border-t border-line" : ""}`}
            >
              <dt className="shrink-0 text-ink-3">{term}</dt>
              <dd className="num min-w-0 truncate text-right text-ink">{desc}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
          {blankList.length === 0 ? (
            <li className="flex items-center gap-2 text-st-ok-ink">
              <span className="h-[7px] w-[7px] rounded-full bg-st-ok" />
              빈칸 없음
            </li>
          ) : (
            shownBlanks.map((blank) => (
              <li key={blank.text}>
                <button
                  type="button"
                  onClick={() => jumpTo(blank.id)}
                  className="flex items-center gap-2 text-left text-st-bad hover:underline"
                >
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-st-bad" />
                  {blank.text}
                </button>
              </li>
            ))
          )}
          {blankList.length > shownBlanks.length ? (
            <li className="num pl-[15px] text-ink-3">외 {blankList.length - shownBlanks.length}곳</li>
          ) : null}
        </ul>

        <button type="button" onClick={handleSave} disabled={saving} className={`${btnPrimary} mt-4 h-11 w-full`}>
          {saving ? "저장 중" : "저장"}
        </button>
        <div className="mt-2.5 flex justify-between text-[13px] text-ink-2">
          <button type="button" onClick={handleTempSave} className="hover:text-ink">
            임시저장
          </button>
          <button
            type="button"
            onClick={() => {
              const filled = { ...sampleJob, id: job.id, mode: job.mode, video: job.video };
              setJob(filled);
              openOnly(filled.questions);
              setToast({ tone: "ok", text: "예시 내용을 채웠습니다" });
            }}
            className="hover:text-ink"
          >
            예시로 채우기
          </button>
        </div>
      </aside>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-10 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm text-surface shadow-lg"
        >
          {toast.tone === "warn" ? <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-st-bad" /> : null}
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
