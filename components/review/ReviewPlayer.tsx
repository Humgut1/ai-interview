"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { textareaClass } from "@/components/ui/Field";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { clampScore, effectiveScore, isOverridden, messagesFor, reportTotals } from "@/lib/review";
import { mdhm } from "@/lib/candidates";
import { saveReviewAction } from "@/app/actions";
import { REQUEST_LABEL } from "@/lib/requests";
import type { ScreenRequest } from "@/lib/store";
import type {
  CandidateRow,
  ChatMessage,
  InterviewReport,
  RecruiterReview,
  ReviewStatus,
} from "@/lib/types";

/** 받아 적는 중일 때 화면을 다시 불러 결과를 받는 간격·최대 횟수(약 5분) */
const REFRESH_MS = 8_000;
const REFRESH_MAX = 40;

function clock(total: number) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 받아 적기 상태 한 마디. 실패·멈춤은 사유를 붙인다. */
function sttLabel(m: ChatMessage, ready: boolean) {
  const note = m.sttNote;
  if (m.stt === "done") return note ? `받아 적음 · ${note}` : "";
  if (m.stt === "failed") return `받아 적기 실패${note ? ` · ${note}` : ""} · 영상을 직접 확인하세요`;
  if (!ready) return "받아 적기 서비스 미연결";
  return note ? `받아 적기 멈춤 · ${note}` : "받아 적는 중";
}

/** 한 질문 안의 답 하나 + 그 답을 부른 질문(본 질문 또는 되묻기) */
type Clip = { answer: ChatMessage; prompt?: ChatMessage };

function clipsOf(report: InterviewReport, questionId: string): Clip[] {
  const msgs = messagesFor(report, questionId);
  const out: Clip[] = [];
  let prompt: ChatMessage | undefined;
  for (const m of msgs) {
    if (m.role === "candidate") out.push({ answer: m, prompt });
    else if (m.kind === "question" || m.kind === "followUp") prompt = m;
  }
  return out;
}

const REVIEW_LOOK: Record<ReviewStatus, { label: string; ink: string; dot: string }> = {
  미검토: { label: "검토 대기", ink: "text-st-warn-ink", dot: "bg-st-warn" },
  검토중: { label: "검토 중", ink: "text-st-run-ink", dot: "bg-st-run" },
  검토완료: { label: "검토 끝", ink: "text-st-ok-ink", dot: "bg-st-ok" },
};

function Dot({ ink, dot, children }: { ink: string; dot: string; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1.5 ${ink}`}>
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/**
 * D4 가 — 후보자 한 명의 AI 면접 확인.
 * 왼쪽 질문 목록 · 가운데 영상(글 면접이면 답 글) · 오른쪽 받아 적은 글 / 메모.
 */
export default function ReviewPlayer({
  report,
  candidates,
  initialReview,
  initialStatus,
  requests = [],
  sttReady = false,
  hireUrl,
}: {
  report: InterviewReport;
  candidates: CandidateRow[];
  initialReview: RecruiterReview;
  initialStatus: ReviewStatus;
  requests?: ScreenRequest[];
  sttReady?: boolean;
  hireUrl: string;
}) {
  const router = useRouter();
  const [review, setReview] = useState<RecruiterReview>(initialReview);
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [qi, setQi] = useState(0);
  const [ci, setCi] = useState(0);
  const [side, setSide] = useState<"text" | "memo">("text");
  const [now, setNow] = useState(-1);
  const [broken, setBroken] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  /** 영상 주소는 잠깐만 열린다. 새로고침으로 새 주소가 와도 처음 받은 주소를 계속 쓴다(재생이 안 끊기게). */
  const firstUrl = useRef(new Map<string, string>());

  const video_mode = report.mode !== "text" && report.transcript.some((m) => m.media);
  const questions = report.questions;
  const q = questions[qi];
  const clips = useMemo(() => (q ? clipsOf(report, q.id) : []), [report, q]);
  const clip = clips[Math.min(ci, Math.max(0, clips.length - 1))];
  const score = q ? report.scores.find((s) => s.questionId === q.id) : undefined;
  const scored = report.scores.length > 0;
  const totals = reportTotals(report, review);
  const memoCount =
    Object.values(review.memos).filter((m) => m.trim()).length + (review.overallMemo.trim() ? 1 : 0);
  const recorded = report.transcript.reduce((sum, m) => sum + (m.media?.seconds ?? 0), 0);

  const idx = candidates.findIndex((c) => c.reportId === report.id);
  const prev = idx > 0 ? candidates[idx - 1] : undefined;
  const next = idx >= 0 && idx < candidates.length - 1 ? candidates[idx + 1] : undefined;
  const name = report.name ?? report.candidateLabel;

  // 받아 적는 중이면 잠깐씩 화면을 다시 불러 결과를 받는다(입력 중인 메모는 그대로 남는다)
  const waiting = sttReady && report.transcript.some((m) => m.stt === "pending" && !m.sttNote);
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      if (n > REFRESH_MAX) clearInterval(timer);
      else router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

  // 떠나기 전에 저장 안 한 메모가 있으면 묻는다
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function pick(nextQ: number, nextC = 0) {
    setQi(nextQ);
    setCi(nextC);
    setNow(-1);
    setBroken(false);
  }

  function seek(s: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = s;
    void v.play().catch(() => {});
  }

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  function edit(fn: (r: RecruiterReview) => RecruiterReview) {
    setReview(fn);
    setDirty(true);
  }

  async function save(nextStatus: ReviewStatus) {
    if (saving) return;
    setSaving(true);
    const result = await saveReviewAction(report.id, review, nextStatus);
    setSaving(false);
    if (!result.ok) {
      notify("저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }
    setStatus(nextStatus);
    setDirty(false);
    notify(nextStatus === "검토완료" ? "검토를 끝냈습니다." : "저장했습니다.");
  }

  const src = clip?.answer.media
    ? (() => {
        const id = clip.answer.id;
        if (!firstUrl.current.has(id) && clip.answer.media.url) firstUrl.current.set(id, clip.answer.media.url);
        return firstUrl.current.get(id);
      })()
    : undefined;
  const segments = clip?.answer.segments ?? [];
  const look = REVIEW_LOOK[status];

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col px-4 pt-4 pb-10 lg:px-7">
      {/* 위치 + 이전·다음 후보자 */}
      <div className="flex items-center gap-2 text-[13px]">
        <Link href="/dashboard" className="shrink-0 text-ink-3 hover:text-ink">
          공고
        </Link>
        <span className="text-line-strong">/</span>
        <Link href={`/jobs/${report.jobId}/candidates`} className="truncate text-ink-3 hover:text-ink">
          {report.jobTitle}
        </Link>
        <span className="text-line-strong">/</span>
        <span className="truncate font-semibold text-ink">{name}</span>
        {candidates.length > 1 && idx >= 0 ? (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="num mr-1 text-ink-2">
              {idx + 1} / {candidates.length}
            </span>
            <NavBtn href={prev && `/interviews/${prev.reportId}`} label="이전 후보자" d="M15 18l-6-6 6-6" />
            <NavBtn href={next && `/interviews/${next.reportId}`} label="다음 후보자" d="M9 18l6-6-6-6" />
          </div>
        ) : null}
      </div>

      {/* 머리 */}
      <div className="mt-3 flex flex-wrap items-end gap-3 border-b border-ink pb-3.5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-ink-2">
            <Dot {...look}>{look.label}</Dot>
            <span className="num">제출 {mdhm(report.completedAt)}</span>
            {recorded ? <span className="num">총 녹화 {clock(recorded)}</span> : null}
            {scored ? <span className="num">종합 {totals.final}</span> : null}
            {report.email ? <span className="truncate">{report.email}</span> : null}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {report.hirePositionId && report.hireCandidateId ? (
            <a
              href={`${hireUrl}/p/${report.hirePositionId}/board?c=${report.hireCandidateId}`}
              target="_blank"
              rel="noreferrer"
              className={btnSecondary}
            >
              Hire 에서 보기
            </a>
          ) : null}
          {status === "검토완료" ? (
            <button type="button" onClick={() => save("검토중")} disabled={saving} className={btnSecondary}>
              다시 검토
            </button>
          ) : (
            <button type="button" onClick={() => save("검토완료")} disabled={saving} className={btnPrimary}>
              검토 끝
            </button>
          )}
        </div>
      </div>

      {requests.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-st-warn/40 px-4 py-2.5 text-sm">
          <Dot ink="text-st-warn-ink font-semibold" dot="bg-st-warn">
            후보자 요청
          </Dot>
          <span className="text-ink">{requests.map((r) => REQUEST_LABEL[r.kind]).join(" · ")}</span>
          <Link href="/requests" className="ml-auto text-ink underline underline-offset-2">
            요청 처리
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
        {/* 질문 목록 */}
        <ol className="flex flex-col gap-1 lg:sticky lg:top-4">
          {questions.map((item, i) => {
            const on = i === qi;
            const cl = clipsOf(report, item.id);
            const sec = cl.reduce((s, c) => s + (c.answer.media?.seconds ?? 0), 0);
            const sc = report.scores.find((s) => s.questionId === item.id);
            const memo = review.memos[item.id]?.trim();
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-current={on ? "true" : undefined}
                  className={`w-full rounded-md px-3 py-2.5 text-left ${on ? "bg-mute" : "hover:bg-canvas"}`}
                >
                  <span className="flex items-center gap-2 text-xs text-ink-3">
                    <span className={on ? "font-semibold text-ink" : ""}>질문 {i + 1}</span>
                    {sec ? <span className="num">{clock(sec)}</span> : null}
                    {cl.length === 0 ? <span>답 없음</span> : null}
                    {memo ? <span>메모</span> : null}
                    {sc ? (
                      <span className={`num ml-auto font-semibold ${isOverridden(sc, review) ? "text-ink" : "text-ink-2"}`}>
                        {effectiveScore(sc, review)}
                      </span>
                    ) : null}
                  </span>
                  <span className={`mt-0.5 line-clamp-2 text-[13px] leading-snug ${on ? "text-ink" : "text-ink-2"}`}>
                    {item.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* 가운데 — 영상(또는 답 글) */}
        <section className="min-w-0">
          {video_mode ? (
            clip?.answer.media ? (
              src && !broken ? (
                <video
                  key={clip.answer.id}
                  ref={video}
                  src={src}
                  controls
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                  onError={() => setBroken(true)}
                  className="aspect-video w-full rounded-md bg-black"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-mute px-4 text-center text-sm text-ink-2">
                  {broken ? "영상 주소가 만료되었습니다. 화면을 새로 불러오세요." : "영상을 불러오지 못했습니다."}
                </div>
              )
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-md bg-mute text-sm text-ink-3">
                {clips.length ? "글로 낸 답" : "이 질문에는 답이 없습니다"}
              </div>
            )
          ) : null}

          {clips.length > 1 ? (
            <div role="tablist" className="mt-3 flex flex-wrap gap-1.5">
              {clips.map((c, i) => (
                <button
                  key={c.answer.id}
                  type="button"
                  role="tab"
                  aria-selected={i === ci}
                  onClick={() => pick(qi, i)}
                  className={`h-8 rounded-md border px-3 text-[13px] ${
                    i === ci ? "border-ink bg-ink font-semibold text-surface" : "border-line-strong text-ink-2 hover:text-ink"
                  }`}
                >
                  {c.prompt?.kind === "followUp" ? "되묻기 답" : "답"}
                  {c.answer.media ? <span className="num ml-1.5 opacity-70">{clock(c.answer.media.seconds)}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          {q ? (
            <div className="mt-3">
              <p className="text-xs text-ink-3">
                질문 {qi + 1}
                {clip?.answer.media && clip.answer.media.take > 1 ? ` · ${clip.answer.media.take}번째 녹화` : ""}
                {clip?.answer.media ? ` · ${clock(clip.answer.media.seconds)}` : ""}
              </p>
              <p className="mt-1 text-[17px] leading-relaxed font-semibold text-ink">{q.text}</p>
              {clip?.prompt?.kind === "followUp" ? (
                <p className="mt-2 border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-ink-2">
                  되묻기 · {clip.prompt.text}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 글 면접 — 답 글을 가운데에 */}
          {!video_mode ? (
            <div className="mt-4 flex flex-col gap-3">
              {clips.length === 0 ? <p className="text-sm text-ink-3">이 질문에는 답이 없습니다</p> : null}
              {clips.map((c) => (
                <div key={c.answer.id} className="rounded-md border border-line px-4 py-3">
                  {c.prompt?.kind === "followUp" ? (
                    <p className="mb-1.5 text-xs text-ink-3">되묻기 · {c.prompt.text}</p>
                  ) : null}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{c.answer.text}</p>
                </div>
              ))}
            </div>
          ) : null}

          {score ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-ink-3">AI 점수</span>
                <span className={`num text-lg ${isOverridden(score, review) ? "text-ink-3 line-through" : "text-ink"}`}>
                  {score.score}
                </span>
                <label className="ml-auto flex items-center gap-2 text-xs text-ink-2">
                  담당자 점수
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={review.overrides[score.questionId] ?? ""}
                    placeholder={String(score.score)}
                    onChange={(e) =>
                      edit((r) => {
                        const overrides = { ...r.overrides };
                        if (e.target.value === "") delete overrides[score.questionId];
                        else overrides[score.questionId] = clampScore(Number(e.target.value));
                        return { ...r, overrides };
                      })
                    }
                    className="num h-8 w-16 rounded-md border border-line-strong bg-surface px-2 text-right text-sm text-ink"
                  />
                </label>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink">{score.rationale}</p>
              {score.evidence.length ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {score.evidence.map((ev, i) => (
                    <li key={i} className="border-l-2 border-line-strong pl-3 text-[13px] text-ink-2">
                      {ev.quote}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* 오른쪽 — 받아 적은 글 / 메모 */}
        <aside className="min-w-0 lg:sticky lg:top-4">
          <div role="tablist" className="flex gap-5 border-b border-line">
            {video_mode ? (
              <SideTab on={side === "text"} onClick={() => setSide("text")}>
                받아 적은 글
              </SideTab>
            ) : null}
            <SideTab on={side === "memo" || !video_mode} onClick={() => setSide("memo")}>
              메모 {memoCount ? <span className="num text-ink-3">{memoCount}</span> : null}
            </SideTab>
          </div>

          {video_mode && side === "text" ? (
            <div className="max-h-[60dvh] overflow-y-auto pt-3">
              {clip ? (
                segments.length ? (
                  <ol className="flex flex-col gap-1">
                    {segments.map((seg, i) => {
                      const on = now >= seg.s && now < (segments[i + 1]?.s ?? Infinity);
                      return (
                        <li key={`${seg.s}-${i}`}>
                          <button
                            type="button"
                            onClick={() => seek(seg.s)}
                            className={`flex w-full gap-3 rounded-md px-2 py-1.5 text-left ${on ? "bg-mute" : "hover:bg-canvas"}`}
                          >
                            <span className="num w-9 shrink-0 pt-0.5 text-xs text-ink-3">{clock(seg.s)}</span>
                            <span className={`text-sm leading-relaxed ${on ? "font-semibold text-ink" : "text-ink"}`}>
                              {seg.t}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : clip.answer.text ? (
                  <p className="px-2 text-sm leading-relaxed whitespace-pre-wrap text-ink">{clip.answer.text}</p>
                ) : null
              ) : (
                <p className="px-2 text-sm text-ink-3">답 없음</p>
              )}
              {clip && sttLabel(clip.answer, sttReady) ? (
                <p
                  className={`mt-2 px-2 text-xs ${clip.answer.stt === "failed" ? "font-semibold text-st-warn-ink" : "text-ink-3"}`}
                >
                  {sttLabel(clip.answer, sttReady)}
                </p>
              ) : null}
              <p className="mt-4 border-t border-line px-2 pt-3 text-xs text-ink-3">
                받아 적은 글은 참고용 · 원본은 영상
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              {q ? (
                <label className="block">
                  <span className="text-xs text-ink-3">질문 {qi + 1} 메모</span>
                  <textarea
                    rows={4}
                    value={review.memos[q.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      edit((r) => ({ ...r, memos: { ...r.memos, [q.id]: v } }));
                    }}
                    className={`mt-1.5 ${textareaClass}`}
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="text-xs text-ink-3">전체 메모</span>
                <textarea
                  rows={4}
                  value={review.overallMemo}
                  onChange={(e) => {
                    const v = e.target.value;
                    edit((r) => ({ ...r, overallMemo: v }));
                  }}
                  placeholder="대면 면접에서 확인할 점"
                  className={`mt-1.5 ${textareaClass}`}
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => save(status === "미검토" ? "검토중" : status)}
                  disabled={saving || !dirty}
                  className={btnSecondary}
                >
                  {saving ? "저장 중" : "메모 저장"}
                </button>
                <span className="text-xs text-ink-3">{dirty ? "저장 안 됨" : ""}</span>
              </div>
              <p className="text-xs text-ink-3">합격·불합격은 Hire 에서 정합니다</p>
            </div>
          )}
        </aside>
      </div>

      {toast ? (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm text-surface shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </main>
  );
}

function NavBtn({ href, label, d }: { href?: string; label: string; d: string }) {
  const icon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={d} />
    </svg>
  );
  const cls = "flex h-[34px] w-[34px] items-center justify-center rounded-md border border-line-strong bg-surface";
  return href ? (
    <Link href={href} aria-label={label} className={`${cls} text-ink hover:bg-canvas`}>
      {icon}
    </Link>
  ) : (
    <span aria-hidden className={`${cls} text-ink-3 opacity-50`}>
      {icon}
    </span>
  );
}

function SideTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2.5 text-sm ${
        on ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
