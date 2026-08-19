/**
 * 화면 곳곳에서 되풀이되는 부품의 생김새를 한 곳에 모아 둔다.
 * 여기만 고치면 버튼·카드·라벨이 전부 같이 바뀐다.
 */

/** 흰 카드. 그림자 대신 얇은 선으로 나눈다. */
export const cardClass = "rounded-md border border-line bg-surface";

/** 읽기만 하는 영역 (채점 근거, 안내문). 회색보다 덜 차가운 모래색. */
export const panelClass = "rounded-md border border-line bg-sand";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed";

/** 그 화면에서 제일 중요한 동작 하나에만 쓴다. */
export const btnPrimary = `${btnBase} bg-accent text-white hover:bg-accent-hover disabled:bg-mute disabled:text-ink-3`;

/** 그 다음 동작들. 흰 바탕에 선만. */
export const btnSecondary = `${btnBase} border border-line-strong bg-surface text-ink hover:bg-canvas disabled:text-ink-3`;

/** 배경에 묻어 있어야 하는 보조 동작 (되돌리기 등). */
export const btnGhost = `${btnBase} bg-sand text-ink-2 hover:bg-mute`;

/** 아주 작은 대문자 라벨. 제목이 아니라 '이 칸이 무엇인지' 알려주는 표시. */
export const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3";

/** 점수 막대. 등급에 따라 색을 바꾸지 않는다. */
export const barTrackClass = "h-1.5 w-full overflow-hidden rounded-full bg-mute";
export const barFillClass = "h-full rounded-full bg-bar";

/** 근거로 인용된 문장. 화면에서 유일하게 강조되는 색. */
export const evidenceClass =
  "rounded-sm bg-accent-soft px-1 shadow-[inset_0_-1.5px_0_rgba(15,118,110,0.45)]";
