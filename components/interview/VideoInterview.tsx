"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProgressBar from "@/components/interview/ProgressBar";
import RequestBox from "@/components/interview/RequestBox";
import { btnPrimary, btnSecondary, cardClass, labelClass, panelClass } from "@/components/ui/styles";
import { beginTakeAction, prepareUploadAction, submitVideoAction } from "@/app/actions";
import { progressOf } from "@/lib/interview";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSession, InterviewSetup } from "@/lib/types";

/*
 * 영상 면접 화면. 기기 확인 → (질문마다) 준비 → 녹화 → 다시 보기 → 보내기.
 * 녹화 파일은 브라우저가 Supabase 저장 칸으로 바로 올리고, 서버에는 "어디에 올렸는지"만 알린다.
 * 진행 기록의 원본은 서버다. 새로고침하면 기기 확인부터 다시 하고 같은 질문에서 이어진다.
 */

type Step = "check" | "prep" | "rec" | "review" | "upload";

type Take = { blob: Blob; url: string; seconds: number; type: string; take: number };

/** 녹화 형식 — 되는 것 중 앞에 있는 것. mp4 가 되면 담당자가 어느 브라우저로 봐도 재생된다. */
const RECORD_TYPES = [
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickType() {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORD_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function clock(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function deviceError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "카메라·마이크 사용이 막혀 있습니다. 주소창 왼쪽의 자물쇠 표시에서 카메라와 마이크를 허용으로 바꾼 뒤 다시 눌러 주세요.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "카메라나 마이크를 찾지 못했습니다. 연결을 확인하고 다시 눌러 주세요.";
  }
  if (name === "NotReadableError") {
    return "다른 프로그램이 카메라를 쓰고 있습니다. 화상회의 앱 등을 닫고 다시 눌러 주세요.";
  }
  return "카메라를 켜지 못했습니다. 다시 눌러 주세요. 계속되면 다른 브라우저로 열어 주세요.";
}

const FAIL: Record<string, string> = {
  missing: "면접 링크를 찾을 수 없습니다. 받은 링크를 다시 확인해 주세요.",
  expired: "면접 링크의 기한이 지났습니다. 채용 담당자에게 문의해 주세요.",
  closed: "더 이상 진행할 수 없는 면접입니다. 화면을 다시 불러옵니다.",
  stale: "다른 창에서 진행한 내용이 있어 최신 상태로 다시 불러옵니다.",
  type: "이 브라우저의 녹화 형식은 받을 수 없습니다. 크롬·사파리·엣지 최신판으로 열어 주세요.",
  error: "보내지 못했습니다. 연결을 확인하고 다시 보내 주세요. 녹화한 답변은 그대로 있습니다.",
  upload: "영상을 올리지 못했습니다. 연결을 확인하고 다시 보내 주세요. 녹화한 답변은 그대로 있습니다.",
};

/** 녹화 파일을 올린다. 진행률을 알려 주려고 fetch 대신 XHR. */
function putVideo(url: string, blob: Blob, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", blob);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

export default function VideoInterview({
  setup,
  session,
  onSession,
  rights,
  onRights,
}: {
  setup: InterviewSetup;
  session: InterviewSession;
  onSession: (session: InterviewSession) => void;
  rights: CandidateRights;
  onRights: (rights: CandidateRights) => void;
}) {
  const [step, setStep] = useState<Step>("check");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deviceMsg, setDeviceMsg] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [left, setLeft] = useState(setup.video.prepSec);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [percent, setPercent] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const liveRef = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const ticket = useRef<{ seen: number; url: string; path: string } | null>(null);
  // 두 번 눌러도 한 번만. state 는 다음 그리기 전까지 안 바뀌므로 ref 로 막는다.
  const lock = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const seen = session.messages.length;
  const prompt = session.messages[seen - 1];
  const progress = progressOf(session, setup);
  const maxTakes = 1 + setup.video.retakes;
  const recordType = typeof window === "undefined" ? null : pickType();

  // 화면 밖으로 나가면 카메라를 끈다.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // 미리보기 화면에 카메라를 잇는다.
  useEffect(() => {
    if (liveRef.current && liveRef.current.srcObject !== stream) {
      liveRef.current.srcObject = stream;
    }
  }, [stream, step]);

  // 마이크 소리 크기 막대 (기기 확인 화면에서만)
  useEffect(() => {
    if (!stream || step !== "check") return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx || stream.getAudioTracks().length === 0) return;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.min(1, Math.sqrt(sum / data.length) * 4);
      setLevel(rms);
      if (rms > 0.12) setHeard(true);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }, [stream, step]);

  // 녹화 중·보내기 전에 창을 닫으려 하면 한 번 묻는다.
  useEffect(() => {
    if (step !== "rec" && step !== "review" && step !== "upload") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step]);

  // 다시 보기 파일은 다 쓰면 메모리에서 뺀다.
  useEffect(() => {
    return () => {
      if (take) URL.revokeObjectURL(take.url);
    };
  }, [take]);

  function fail(reason: string) {
    setFailure(FAIL[reason] ?? FAIL.error);
    if (reason === "stale" || reason === "closed") {
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  async function openDevices() {
    if (opening) return;
    setDeviceMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || !recordType) {
      setDeviceMsg("이 브라우저에서는 녹화할 수 없습니다. 크롬·사파리·엣지 최신판으로 열어 주세요.");
      return;
    }
    setOpening(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = media;
      // 면접 중 카메라가 빠지면(선 뽑힘 등) 기기 확인으로 돌아간다.
      media.getTracks().forEach((track) =>
        track.addEventListener("ended", () => {
          if (recorder.current?.state === "recording") recorder.current.stop();
          setStream(null);
          setStep("check");
          setDeviceMsg("카메라나 마이크 연결이 끊겼습니다. 다시 켜 주세요.");
        })
      );
      setStream(media);
    } catch (error) {
      setDeviceMsg(deviceError(error));
    } finally {
      setOpening(false);
    }
  }

  const startRecording = useCallback(async () => {
    if (lock.current || !stream || !recordType) return;
    lock.current = true;
    setFailure(null);
    try {
      const began = await beginTakeAction(setup.token, seen);
      if (!began.ok) {
        fail(began.reason);
        return;
      }
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, {
        mimeType: recordType,
        videoBitsPerSecond: 600_000,
        audioBitsPerSecond: 64_000,
      });
      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      rec.onstop = () => {
        const seconds = (performance.now() - startedAt.current) / 1000;
        const type = recordType.split(";")[0];
        const blob = new Blob(chunks, { type });
        setTake({ blob, url: URL.createObjectURL(blob), seconds, type, take: began.take });
        setStep("review");
      };
      recorder.current = rec;
      rec.start(1000);
      startedAt.current = performance.now();
      setElapsed(0);
      setStep("rec");
    } catch {
      setFailure(FAIL.error);
    } finally {
      lock.current = false;
    }
  }, [stream, recordType, seen, setup.token]);

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  // 준비 시간 세기 → 0 이 되면 녹화 시작
  useEffect(() => {
    if (step !== "prep") return;
    const timer = setTimeout(() => {
      if (left <= 1) void startRecording();
      else setLeft((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, left, startRecording]);

  // 녹화 시간 세기 → 최대 시간이면 멈춤
  useEffect(() => {
    if (step !== "rec") return;
    const timer = setInterval(() => {
      const sec = (performance.now() - startedAt.current) / 1000;
      setElapsed(sec);
      if (sec >= setup.video.answerSec) stopRecording();
    }, 250);
    return () => clearInterval(timer);
  }, [step, setup.video.answerSec]);

  function beginPrep() {
    setTake(null);
    setFailure(null);
    setLeft(setup.video.prepSec);
    setStep("prep");
  }

  async function send() {
    if (lock.current || !take) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    setStep("upload");
    setPercent(0);
    try {
      // 올릴 주소는 이 차례에 한 번 받아 두고, 다시 보내기에도 쓴다(2시간 유효).
      if (!ticket.current || ticket.current.seen !== seen) {
        const got = await prepareUploadAction(setup.token, seen, take.type);
        if (!got.ok) {
          setStep("review");
          fail(got.reason);
          return;
        }
        ticket.current = { seen, url: got.url, path: got.path };
      }
      try {
        await putVideo(ticket.current.url, take.blob, setPercent);
      } catch (error) {
        // 이미 올라가 있으면(앞선 시도가 끝까지 갔으면) 그대로 진행
        if (!(error instanceof Error && error.message === "400")) {
          ticket.current = null;
          setStep("review");
          setFailure(FAIL.upload);
          return;
        }
      }
      const reply = await submitVideoAction(setup.token, seen, ticket.current.path, take.seconds);
      if (!reply.ok) {
        setStep("review");
        fail(reply.reason);
        return;
      }
      ticket.current = null;
      setTake(null);
      onSession(reply.session);
      if (reply.session.phase !== "done") {
        setLeft(setup.video.prepSec);
        setStep("prep");
      }
    } catch {
      setStep("review");
      setFailure(FAIL.error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const header = (
    <header className="shrink-0 border-b border-line bg-surface px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5">
        <p className="truncate text-sm font-semibold text-ink">{setup.jobTitle} · 1차 영상 면접</p>
        <ProgressBar current={progress.current} total={progress.total} percent={progress.percent} />
      </div>
    </header>
  );

  const live = (
    <video
      ref={liveRef}
      autoPlay
      muted
      playsInline
      aria-label="내 카메라 화면"
      className={`aspect-[4/3] w-full -scale-x-100 rounded-md bg-black object-cover ${
        step === "review" || step === "upload" || !stream ? "hidden" : ""
      }`}
    />
  );

  if (step === "check") {
    return (
      <div className="min-h-dvh bg-canvas">
        {header}
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <p className={labelClass}>기기 확인</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">카메라와 마이크를 확인합니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            얼굴이 화면 가운데 보이는지, 말할 때 아래 막대가 움직이는지 확인해 주세요.
          </p>

          <div className="mt-5">
            {live}
            {stream ? null : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-line-strong bg-surface px-6 text-center text-sm text-ink-3">
                카메라가 꺼져 있습니다
              </div>
            )}
          </div>

          {stream ? (
            <div className={`${cardClass} mt-3 px-4 py-3`}>
              <div className="flex items-center justify-between text-xs text-ink-2">
                <span>마이크</span>
                <span>{heard ? "소리가 들어옵니다" : "말씀해 보세요"}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mute">
                <div className="h-full rounded-full bg-ink transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            </div>
          ) : null}

          {deviceMsg ? (
            <p role="alert" className="mt-3 text-sm leading-relaxed text-rose-600 dark:text-rose-400">
              {deviceMsg}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {stream ? (
              <>
                <button type="button" onClick={beginPrep} className={`${btnPrimary} py-3 sm:flex-1`}>
                  {seen > 2 ? "이어서 진행하기" : "첫 질문 보기"}
                </button>
                <button type="button" onClick={openDevices} className={`${btnSecondary} py-3`}>
                  다시 켜기
                </button>
              </>
            ) : (
              <button type="button" onClick={openDevices} disabled={opening} className={`${btnPrimary} py-3 sm:flex-1`}>
                {opening ? "켜는 중…" : "카메라·마이크 켜기"}
              </button>
            )}
          </div>
          {stream && !heard ? (
            <p className="mt-2 text-xs text-ink-3">막대가 움직이지 않으면 마이크 연결을 확인해 주세요.</p>
          ) : null}

          <section className={`${panelClass} mt-6 px-4 py-3.5`}>
            <h2 className={labelClass}>녹화 규칙</h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
              <li>질문마다 준비 {clock(setup.video.prepSec)} · 답변 최대 {clock(setup.video.answerSec)}</li>
              <li>{setup.video.retakes > 0 ? `질문마다 ${setup.video.retakes}번 다시 찍기` : "다시 찍기 없음"}</li>
              <li>표정·목소리 톤·배경은 평가하지 않습니다</li>
            </ul>
          </section>

          <RequestBox
            token={setup.token}
            rights={rights}
            kinds={["human"]}
            onRights={onRights}
            title="카메라 면접이 어려우신가요"
          />
        </div>
      </div>
    );
  }

  const label = prompt?.kind === "followUp" ? "추가 질문" : `질문 ${progress.current}`;
  const takesLeft = take ? Math.max(0, maxTakes - take.take) : 0;

  return (
    <div className="min-h-dvh bg-canvas">
      {header}
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <section className={`${cardClass} px-4 py-4`}>
          <p className={labelClass}>{label}</p>
          <p className="mt-2 text-base leading-relaxed text-ink">{prompt?.text}</p>
        </section>

        <div className="relative mt-4">
          {live}
          {step === "prep" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-black/55 text-white">
              <span className="text-xs">녹화까지</span>
              <span className="num mt-1 text-5xl font-semibold" aria-live="polite">
                {left}
              </span>
            </div>
          ) : null}
          {step === "rec" ? (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2.5 py-1 text-xs text-white">
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="num">
                녹화 중 {clock(elapsed)} / {clock(setup.video.answerSec)}
              </span>
            </div>
          ) : null}
          {(step === "review" || step === "upload") && take ? (
            <video
              key={take.url}
              src={take.url}
              controls
              playsInline
              aria-label="녹화한 답변 다시 보기"
              className="aspect-[4/3] w-full rounded-md bg-black object-contain"
            />
          ) : null}
        </div>

        {step === "rec" ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-mute">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${Math.min(100, (elapsed / setup.video.answerSec) * 100)}%` }}
            />
          </div>
        ) : null}

        {failure ? (
          <p role="alert" className="mt-3 text-sm leading-relaxed text-rose-600 dark:text-rose-400">
            {failure}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {step === "prep" ? (
            <button type="button" onClick={() => void startRecording()} className={`${btnPrimary} py-3 sm:flex-1`}>
              지금 녹화 시작
            </button>
          ) : null}
          {step === "rec" ? (
            <button
              type="button"
              onClick={stopRecording}
              disabled={elapsed < 3}
              className={`${btnPrimary} py-3 sm:flex-1`}
            >
              답변 끝내기
            </button>
          ) : null}
          {step === "review" ? (
            <>
              <button type="button" onClick={send} disabled={busy} className={`${btnPrimary} py-3 sm:flex-1`}>
                이 답변 보내기
              </button>
              {takesLeft > 0 ? (
                <button type="button" onClick={beginPrep} disabled={busy} className={`${btnSecondary} py-3`}>
                  다시 찍기 (남은 {takesLeft}번)
                </button>
              ) : null}
            </>
          ) : null}
          {step === "upload" ? (
            <div role="status" className={`${cardClass} flex-1 px-4 py-3`}>
              <div className="flex justify-between text-xs text-ink-2">
                <span>답변을 보내는 중입니다. 창을 닫지 마세요.</span>
                <span className="num">{percent}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mute">
                <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        {step === "review" ? (
          <p className="mt-2 text-xs text-ink-3">
            {clock(take?.seconds ?? 0)} 녹화 · 보낸 답변은 바꿀 수 없습니다
            {takesLeft > 0 ? "" : " · 다시 찍기를 다 썼습니다"}
          </p>
        ) : null}
        {step === "prep" ? (
          <p className="mt-2 text-xs text-ink-3">
            답변은 최대 {clock(setup.video.answerSec)}입니다. 시간이 되면 녹화가 멈춥니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
