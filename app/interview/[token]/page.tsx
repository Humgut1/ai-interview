import ChatWindow from "@/components/interview/ChatWindow";
import { getInterviewByToken } from "@/lib/mock/interview";

export const metadata = {
  title: "1차 면접 · AI 면접",
};

/**
 * 후보자용 화면. 로그인 없이 링크(토큰)만으로 들어온다.
 * API 연결 단계에서 토큰이 유효한지 서버에서 확인하고, 만료·사용완료 처리를 붙인다.
 */
export default async function InterviewPage({
  params,
}: PageProps<"/interview/[token]">) {
  const { token } = await params;
  const setup = getInterviewByToken(token);

  return <ChatWindow setup={setup} />;
}
