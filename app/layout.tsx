import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";

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
      className={`${unbounded.variable} h-full antialiased`}
    >
      <head>
        {/* 한글 글꼴. Hire·Core 와 같은 Pretendard — 없으면 윈도 기본 글꼴로 떨어져 제품마다 글자가 달라 보인다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full bg-canvas text-ink">{children}</body>
    </html>
  );
}
