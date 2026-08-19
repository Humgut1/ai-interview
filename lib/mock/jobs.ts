import { createQuestion } from "@/lib/rubric";
import type { Job, Question } from "@/lib/types";

/**
 * 화면 확인용 가짜(mock) 데이터.
 * 실제 저장/조회는 API 연결 단계에서 Supabase 로 연결한다.
 * 실존 회사명·실명은 쓰지 않는다.
 */
export const sampleJob: Job = {
  id: "job-sample",
  title: "백엔드 엔지니어 (경력 3년 이상)",
  description:
    "결제·정산 도메인의 API 를 설계하고 운영합니다. 장애 대응 경험과 협업 과정에서의 커뮤니케이션을 중요하게 봅니다.",
  questions: [
    createQuestion({
      text: "최근에 맡았던 서비스에서 성능이나 안정성 문제를 발견하고 해결한 경험을 말씀해 주세요.",
      weight: 4,
      maxFollowUps: 2,
      criteria: {
        excellent:
          "문제를 어떻게 인지했는지(지표·로그), 원인을 좁혀간 과정, 선택한 해결책과 그 이유, 개선 결과를 수치나 사실로 설명한다.",
        average:
          "무엇을 고쳤는지는 말하지만 원인을 찾은 과정이나 결과가 두루뭉술하다.",
        poor: "구체적 사례를 대지 못하거나, 본인이 실제로 한 일이 드러나지 않는다.",
      },
    }),
    createQuestion({
      text: "동료와 기술적 의견이 갈렸던 상황과, 그때 본인이 한 행동을 알려 주세요.",
      weight: 3,
      maxFollowUps: 1,
      criteria: {
        excellent:
          "상대 의견을 정확히 요약하고, 근거를 놓고 조율한 과정과 최종 결론·회고까지 설명한다.",
        average: "상황은 설명하지만 본인이 한 행동이나 결론이 흐릿하다.",
        poor: "상대 탓만 하거나, 갈등을 회피했다는 설명에 그친다.",
      },
    }),
    createQuestion({
      text: "이 직무에 지원하신 이유와, 입사 후 첫 3개월에 하고 싶은 일을 말씀해 주세요.",
      weight: 2,
      maxFollowUps: 1,
      criteria: {
        excellent:
          "직무 내용과 본인 경험을 구체적으로 연결하고, 현실적인 초기 목표를 제시한다.",
        average: "관심은 드러나지만 직무와의 연결이 일반적인 수준이다.",
        poor: "회사·직무와 무관한 이야기이거나 준비되지 않은 답변이다.",
      },
    }),
  ],
};

/**
 * "직무 설명으로 rubric 초안 생성" 버튼의 임시 동작.
 * API 연결 단계에서 Claude API 호출로 교체된다. 지금은 정해진 초안을 잠시 뒤에 돌려준다.
 */
export async function generateDraftQuestions(
  description: string
): Promise<Question[]> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const base: Question[] = [
    createQuestion({
      text: "이 직무와 가장 가까웠던 최근 업무 경험을 하나 골라, 맡은 역할과 결과를 말씀해 주세요.",
      weight: 4,
      maxFollowUps: 2,
      criteria: {
        excellent:
          "상황·본인 역할·구체적 행동·결과가 모두 드러나고, 결과를 사실이나 수치로 뒷받침한다.",
        average: "경험은 설명하지만 본인 기여와 결과의 연결이 약하다.",
        poor: "일반론에 그치거나 본인이 무엇을 했는지 확인되지 않는다.",
      },
    }),
    createQuestion({
      text: "일이 계획대로 되지 않았던 경험과, 그때 어떻게 대응했는지 알려 주세요.",
      weight: 3,
      maxFollowUps: 2,
      criteria: {
        excellent:
          "문제를 인정하고 원인을 스스로 분석했으며, 재발을 막기 위한 조치까지 설명한다.",
        average: "대응은 설명하지만 원인 분석이나 이후 개선이 빠져 있다.",
        poor: "외부 요인만 탓하거나 사례를 제시하지 못한다.",
      },
    }),
    createQuestion({
      text: "함께 일하는 사람들에게 본인이 어떤 방식으로 도움이 되는지 예를 들어 설명해 주세요.",
      weight: 2,
      maxFollowUps: 1,
      criteria: {
        excellent: "협업 사례를 구체적으로 들고, 상대 입장에서의 효과까지 설명한다.",
        average: "성향 위주로 설명하고 사례가 한정적이다.",
        poor: "구체적 예시 없이 추상적인 성격 묘사에 머문다.",
      },
    }),
  ];

  const text = description.toLowerCase();
  const wantsTech = /개발|엔지니어|백엔드|프론트|데이터|api|서버/.test(text);

  if (wantsTech) {
    base.splice(
      1,
      0,
      createQuestion({
        text: "직접 설계하거나 개선한 구조를 하나 소개하고, 그렇게 결정한 이유를 설명해 주세요.",
        weight: 4,
        maxFollowUps: 2,
        criteria: {
          excellent:
            "선택지들을 비교한 기준과 트레이드오프를 설명하고, 운영하며 확인한 결과까지 말한다.",
          average: "무엇을 만들었는지는 설명하지만 결정 이유가 얕다.",
          poor: "기술 용어만 나열하고 본인의 판단 근거가 드러나지 않는다.",
        },
      })
    );
  }

  return base;
}
