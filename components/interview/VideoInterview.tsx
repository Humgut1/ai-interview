"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CandidateTop, { type TopStep } from "@/components/interview/CandidateTop";
import { clock } from "@/components/interview/ConsentScreen";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { beginTakeAction, prepareUploadAction, submitVideoAction } from "@/app/actions";
import { progressOf } from "@/lib/interview";
import type { CandidateRights } from "@/lib/store";
import type { InterviewSession, InterviewSetup } from "@/lib/types";

/*
 * 영상 면접 화면. 기기 확인(C3) → (질문마다) 준비 → 녹화 → 다시 보기 → 보내기(C5).
 * 녹화 파일은 브라우저가 Supabase 저장 칸으로 바로 올리고, 서버에는 "어디에 올렸는지"만 알린다.
 * 진행 기록의 원본은 서버다. 새로고침하면 기기 확인부터 다시 하고 같은 질문에서 이어진다.
 */

type Step = "check" | "prep" | "rec" | "review" | "upload";

type Take = { blob: Blob; url: string; seconds: number; type: string; take: number };

type Dev = { id: string; label: string };

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

/** 상태 점 + 글. 색은 상태에만. */
function Status({ tone, children }: { tone: "ok" | "warn" | "bad" | "off"; children: React.ReactNode }) {
  const dot = { ok: "bg-st-ok", warn: "bg-st-warn", bad: "bg-st-bad", off: "bg-st-off" }[tone];
  const ink = { ok: "text-st-ok-ink", warn: "text-st-warn-ink", bad: "text-st-bad", off: "text-ink-3" }[tone];
  return (
    <span className={`flex items-center gap-1.5 text-[13px] ${ink}`}>
      <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      {children}
    </span>
  );
}

const selectClass =
  "mt-2.5 h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink disabled:text-ink-3";

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
  const [cams, setCams] = useState<Dev[]>([]);
  const [mics, setMics] = useState<Dev[]>([]);
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [light, setLight] = useState<"ok" | "dark" | null>(null);
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
  const autoOpened = useRef(false);

  const seen = session.messages.length;
  const prompt = session.messages[seen - 1];
  const progress = progressOf(session, setup);
  const maxTakes = 1 + setup.video.retakes;
  const [recordType] = useState(() => (typeof window === "undefined" ? null : pickType()));
  const total = setup.questions.length;

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
    // 브라우저가 소리 처리를 멈춘 채로 만들 때가 있다 — 막대가 0 에 붙어 있지 않게 깨운다.
    void ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    // 화면 새로 그리기(rAF) 대신 타이머 — 창이 가려져도 멈추지 않고, 막대에는 이 정도면 충분하다.
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.min(1, Math.sqrt(sum / data.length) * 4);
      setLevel(rms);
      if (rms > 0.12) setHeard(true);
    };
    const timer = setInterval(tick, 80);
    return () => {
      clearInterval(timer);
      void ctx.close();
    };
  }, [stream, step]);

  // 밝기 — 1초마다 작은 캔버스에 한 장 그려 평균 밝기만 본다. 평가와 무관, 안내용.
  useEffect(() => {
    if (!stream || step !== "check") return;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const timer = setInterval(() => {
      const video = liveRef.current;
      if (!ctx || !video || video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, 32, 24);
      const px = ctx.getImageData(0, 0, 32, 24).data;
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      setLight(sum / (px.length / 4) < 60 ? "dark" : "ok");
    }, 1000);
    return () => clearInterval(timer);
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

  const openDevices = useCallback(
    async (want?: { cam?: string; mic?: string }) => {
      setDeviceMsg(null);
      if (!navigator.mediaDevices?.getUserMedia || !recordType) {
        setDeviceMsg("이 브라우저에서는 녹화할 수 없습니다. 크롬·사파리·엣지 최신판으로 열어 주세요.");
        return;
      }
      setOpening(true);
      try {
        // 기기를 바꿀 때는 먼저 끄고 연다 — 일부 카메라는 두 곳에서 동시에 못 연다.
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            ...(want?.cam ? { deviceId: { exact: want.cam } } : { facingMode: "user" }),
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            ...(want?.mic ? { deviceId: { exact: want.mic } } : {}),
          },
        });
        streamRef.current = media;
        // 면접 중 카메라가 빠지면(선 뽑힘 등) 기기 확인으로 돌아간다. 우리가 바꾸느라 끈 것은 무시.
        media.getTracks().forEach((track) =>
          track.addEventListener("ended", () => {
            if (streamRef.current !== media) return;
            if (recorder.current?.state === "recording") recorder.current.stop();
            setStream(null);
            setStep("check");
            setDeviceMsg("카메라나 마이크 연결이 끊겼습니다. 다시 켜 주세요.");
          })
        );
        setStream(media);
        setHeard(false);
        setLight(null);
        setCamId(media.getVideoTracks()[0]?.getSettings().deviceId || want?.cam || "");
        setMicId(media.getAudioTracks()[0]?.getSettings().deviceId || want?.mic || "");
        // 기기 이름은 허락을 받은 뒤에야 보인다.
        const all = await navigator.mediaDevices.enumerateDevices();
        const named = (kind: MediaDeviceKind, word: string) =>
          all
            .filter((d) => d.kind === kind && d.deviceId)
            .map((d, i) => ({ id: d.deviceId, label: d.label || `${word} ${i + 1}` }));
        setCams(named("videoinput", "카메라"));
        setMics(named("audioinput", "마이크"));
      } catch (error) {
        streamRef.current = null;
        setStream(null);
        setDeviceMsg(deviceError(error));
      } finally {
        setOpening(false);
      }
    },
    [recordType]
  );

  // 동의하고 들어오면 바로 카메라를 켠다(허락 창이 한 번 뜬다).
  // 타이머로 미루는 것은 개발 모드의 두 번 실행에서 한 번만 열리게 하려는 것.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoOpened.current) return;
      autoOpened.current = true;
      void openDevices();
    }, 0);
    return () => clearTimeout(timer);
  }, [openDevices]);

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

  const checking = step === "check";
  const steps: TopStep[] = [
    { label: "기기 확인", done: !checking, on: checking },
    { label: `실전 ${progress.current} / ${total}`, on: !checking },
  ];
  const top = (
    <CandidateTop
      title={`${setup.jobTitle} · 1차 영상 면접`}
      steps={steps}
      setup={setup}
      rights={rights}
      onRights={onRights}
    />
  );

  const live = (
    <video
      ref={liveRef}
      autoPlay
      muted
      playsInline
      aria-label="내 카메라 화면"
      className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${
        step === "review" || step === "upload" || !stream ? "hidden" : ""
      }`}
    />
  );

  if (checking) {
    const resumed = seen > 2;
    const segs = Math.round(level * 20);
    return (
      <div className="min-h-dvh bg-canvas">
        {top}
        <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_380px] md:px-16">
          <section className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">카메라와 마이크를 확인합니다</h1>
            <p className="mt-1.5 text-sm text-ink-2">얼굴이 점선 안에 들어오게 앉아 주세요</p>
            <div className="relative mt-5 h-[300px] overflow-hidden rounded-[10px] bg-[#111] md:h-[470px]">
              {live}
              {stream ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/60"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-white/70">{opening ? "카메라를 켜는 중" : "카메라가 꺼져 있습니다"}</p>
                  {opening ? null : (
                    <button
                      type="button"
                      onClick={() => void openDevices()}
                      className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-[#111]"
                    >
                      카메라·마이크 켜기
                    </button>
                  )}
                </div>
              )}
            </div>
            {deviceMsg ? (
              <p role="alert" className="mt-3 text-sm leading-relaxed text-st-bad">
                {deviceMsg}
              </p>
            ) : null}
          </section>

          <aside className="md:pt-[62px]">
            <div className="border-b border-line pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">카메라</span>
                {stream ? <Status tone="ok">잘 보입니다</Status> : <Status tone="off">꺼져 있음</Status>}
              </div>
              <select
                aria-label="카메라 고르기"
                value={camId}
                disabled={!stream || opening || cams.length < 2}
                onChange={(e) => void openDevices({ cam: e.target.value, mic: micId })}
                className={selectClass}
              >
                {cams.length ? cams.map((d) => <option key={d.id} value={d.id}>{d.label}</option>) : <option value="">-</option>}
              </select>
            </div>

            <div className="border-b border-line py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">마이크</span>
                {!stream ? (
                  <Status tone="off">꺼져 있음</Status>
                ) : heard ? (
                  <Status tone="ok">소리가 들어옵니다</Status>
                ) : (
                  <Status tone="off">말씀해 보세요</Status>
                )}
              </div>
              <select
                aria-label="마이크 고르기"
                value={micId}
                disabled={!stream || opening || mics.length < 2}
                onChange={(e) => void openDevices({ cam: camId, mic: e.target.value })}
                className={selectClass}
              >
                {mics.length ? mics.map((d) => <option key={d.id} value={d.id}>{d.label}</option>) : <option value="">-</option>}
              </select>
              <div className="mt-3 flex h-3 gap-[3px]" role="meter" aria-label="마이크 소리 크기" aria-valuemin={0} aria-valuemax={20} aria-valuenow={segs}>
                {Array.from({ length: 20 }, (_, i) => (
                  <span key={i} className={`flex-1 rounded-[2px] ${i < segs ? "bg-ink" : "bg-mute"}`} />
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-3">&quot;안녕하세요&quot; 라고 말해 보세요</p>
            </div>

            <div className="border-b border-line py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">밝기</span>
                {light === "dark" ? (
                  <Status tone="warn">조금 어둡습니다</Status>
                ) : light === "ok" ? (
                  <Status tone="ok">괜찮습니다</Status>
                ) : (
                  <Status tone="off">확인 중</Status>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-3">
                {light === "dark" ? "얼굴 앞쪽에 불을 켜면 더 잘 보입니다 · " : ""}평가와는 무관
              </p>
            </div>

            <div className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">녹화</span>
                {recordType ? <Status tone="ok">이 브라우저에서 됩니다</Status> : <Status tone="bad">이 브라우저에서 안 됩니다</Status>}
              </div>
            </div>

            <button type="button" onClick={beginPrep} disabled={!stream || opening} className={`${btnPrimary} mt-2 h-12 w-full`}>
              {resumed ? `이어서 · 질문 ${progress.current}` : "다음 · 실전 질문"}
            </button>
            {stream ? (
              <button type="button" onClick={() => void openDevices({ cam: camId, mic: micId })} disabled={opening} className="mt-2 w-full text-center text-[13px] text-ink-3 hover:text-ink">
                카메라 다시 켜기
              </button>
            ) : null}
            <p className="mt-3 text-center text-xs text-ink-3">표정·목소리 톤·배경은 평가하지 않습니다</p>
          </aside>
        </main>
      </div>
    );
  }

  const followUp = prompt?.kind === "followUp";
  const takesLeft = take ? Math.max(0, maxTakes - take.take) : 0;
  const nowNote =
    step === "prep" ? "준비 중" : step === "rec" ? "녹화 중" : step === "review" ? "다시 보는 중" : "보내는 중";

  return (
    <div className="min-h-dvh bg-canvas">
      {top}
      <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-7 md:grid-cols-[240px_minmax(0,1fr)] md:px-16">
        <nav aria-label="질문 목록">
          <ol className="flex flex-col gap-1">
            {setup.questions.map((q, i) => {
              const sent = i < session.questionIndex;
              const now = i === session.questionIndex;
              return (
                <li
                  key={q.id}
                  aria-current={now ? "step" : undefined}
                  className={`rounded-lg px-3.5 py-3 ${now ? "bg-mute" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-[7px] w-[7px] shrink-0 rounded-full ${sent ? "bg-st-ok" : now ? "bg-ink" : "bg-line-strong"}`}
                    />
                    <span className={`num text-sm ${now ? "font-semibold text-ink" : sent ? "text-ink" : "text-ink-3"}`}>
                      질문 {i + 1}
                    </span>
                    <span className={`ml-auto text-xs ${sent ? "text-st-ok-ink" : now ? "font-semibold text-ink" : "text-ink-3"}`}>
                      {sent ? "보냄" : now ? "지금" : ""}
                    </span>
                  </div>
                  <p className="mt-1 pl-[15px] text-xs text-ink-3">
                    {sent ? "보낸 답은 바꿀 수 없습니다" : now ? nowNote : "질문은 차례가 되면 보입니다"}
                  </p>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="min-w-0">
          <p className="num text-[13px] text-ink-3">
            질문 {progress.current} / {total}
            {followUp ? " · 추가 질문" : ""}
          </p>
          <h1 className="mt-2 text-xl font-semibold leading-relaxed text-ink">{prompt?.text}</h1>

          <div className="relative mt-5 h-[300px] overflow-hidden rounded-[10px] bg-[#111] md:h-[400px]">
            {live}
            {step === "prep" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
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
                className="absolute inset-0 h-full w-full object-contain"
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
            <p role="alert" className="mt-3 text-sm leading-relaxed text-st-bad">
              {failure}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {step === "prep" ? (
              <button type="button" onClick={() => void startRecording()} className={`${btnPrimary} h-12 sm:w-56`}>
                지금 녹화 시작
              </button>
            ) : null}
            {step === "rec" ? (
              <button type="button" onClick={stopRecording} disabled={elapsed < 3} className={`${btnPrimary} h-12 sm:w-56`}>
                답변 끝내기
              </button>
            ) : null}
            {step === "review" ? (
              <>
                <button type="button" onClick={send} disabled={busy} className={`${btnPrimary} h-12 sm:w-56`}>
                  이 답변 보내기
                </button>
                {takesLeft > 0 ? (
                  <button type="button" onClick={beginPrep} disabled={busy} className={`${btnSecondary} h-12 sm:w-56`}>
                    다시 찍기 (남은 {takesLeft}번)
                  </button>
                ) : null}
              </>
            ) : null}
            {step === "upload" ? (
              <div role="status" className="flex-1 rounded-md border border-line bg-surface px-4 py-3">
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
            <p className="num mt-2.5 text-xs text-ink-3">
              {clock(take?.seconds ?? 0)} 녹화 · 보낸 답변은 바꿀 수 없습니다
              {takesLeft > 0 ? "" : " · 다시 찍기를 다 썼습니다"}
            </p>
          ) : null}
          {step === "prep" ? (
            <p className="num mt-2.5 text-xs text-ink-3">
              답변은 최대 {clock(setup.video.answerSec)} · 시간이 되면 녹화가 멈춥니다
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
