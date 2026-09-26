/**
 * 후보자 권리(SC4.5)의 이름표·숫자. 서버(store)와 화면이 같이 쓴다 — DB 코드는 여기 두지 않는다.
 */

/** 동의 화면 안내문의 판. 문구를 바꾸면 날짜를 올린다 — 누가 어느 판에 동의했는지 남기려고. */
export const CONSENT_VERSION = "2026-09-26b";
export const RETENTION_DEFAULT = 180;
export const RETENTION_MIN = 30;
export const RETENTION_MAX = 1095;
/** 삭제 요청을 담당자가 이 날수 안에 처리하지 않으면 자동으로 지운다(개인정보 보호법 처리 기한 10일). */
export const DELETE_REQUEST_DAYS = 10;

export type RequestKind = "human" | "explain" | "delete";
export const REQUEST_LABEL: Record<RequestKind, string> = {
  human: "담당자 면접 요청",
  explain: "결과 설명 요청",
  delete: "기록 삭제 요청",
};

export type { RequestRow } from "@/lib/store";
