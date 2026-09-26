import Anthropic from "@anthropic-ai/sdk";
import { isAiConfigured } from "@/lib/ai/client";
import { DraftFormatError, draftQuestions } from "@/lib/ai/draft-questions";
import { sampleDraftQuestions } from "@/lib/mock/jobs";
import { staffOrNull } from "@/lib/auth/staff";

/**
 * 직무 설명 → 질문·평가 기준 초안.
 * 브라우저는 이 주소로만 요청하고, Claude 키는 서버에만 있다.
 */

/** 초안 만드는 데 시간이 걸릴 수 있어 여유를 둔다. (초) */
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await staffOrNull())) {
    return Response.json({ ok: false, reason: "로그인이 필요합니다." }, { status: 401 });
  }
  let body: { title?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, reason: "요청을 읽지 못했습니다." },
      { status: 400 }
    );
  }

  const title = typeof body.title === "string" ? body.title : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (description.length < 20) {
    return Response.json(
      {
        ok: false,
        reason:
          "직무 설명을 조금 더 적어 주세요. 맡을 업무와 중요하게 보는 역량이 있어야 질문을 뽑을 수 있습니다.",
      },
      { status: 400 }
    );
  }

  // 키를 넣지 않은 사람(공개 저장소를 그냥 받아 본 경우)도 화면은 볼 수 있어야 한다.
  if (!isAiConfigured()) {
    return Response.json({
      ok: true,
      source: "sample",
      questions: sampleDraftQuestions(description),
      notice:
        "Claude API 키가 설정되어 있지 않아 예시 초안을 대신 넣었습니다. 직무 설명은 아직 반영되지 않았습니다.",
    });
  }

  try {
    const questions = await draftQuestions({ title, description });
    return Response.json({ ok: true, source: "ai", questions });
  } catch (error) {
    console.error("[api/questions/draft]", error);

    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { ok: false, reason: "Claude API 키가 올바르지 않습니다. .env.local 을 확인해 주세요." },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { ok: false, reason: "요청이 몰려 잠시 막혔습니다. 30초쯤 뒤에 다시 눌러 주세요." },
        { status: 429 }
      );
    }
    if (error instanceof DraftFormatError) {
      return Response.json(
        { ok: false, reason: `초안 형식이 어긋났습니다. 다시 시도해 주세요. (${error.message})` },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { ok: false, reason: `Claude 응답에 문제가 있었습니다. (오류 ${error.status ?? "?"})` },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return Response.json(
        { ok: false, reason: "Claude 에 연결하지 못했습니다. 네트워크를 확인해 주세요." },
        { status: 502 }
      );
    }
    return Response.json(
      { ok: false, reason: "초안을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
