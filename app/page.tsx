import { redirect } from "next/navigation";

/** 첫 주소는 담당자 대시보드로. 로그인이 안 돼 있으면 대시보드가 로그인 화면으로 보낸다. */
export default function Home() {
  redirect("/dashboard");
}
