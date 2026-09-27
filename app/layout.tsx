import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 점수를 표시하는 숫자에만 쓴다. 자리가 고정돼 있어 값이 바뀌어도 흔들리지 않는다.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// 로고 글자(talentcore) 전용. components/brand/BrandMark.tsx 가 --font-unbounded 를 쓴다.
const unbounded = Unbounded({ subsets: ["latin"], weight: ["700"], variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "Screen · AI 1차 면접",
  description:
    "평가 기준(rubric)에 따라 1차 면접을 진행하고, 점수와 근거를 사람이 검토하도록 정리해 주는 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">{children}</body>
    </html>
  );
}
