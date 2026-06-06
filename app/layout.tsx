import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIAI - 日本初の総合予測市場プラットフォーム",
  description:
    "政治・経済・スポーツ・カルチャー・テクノロジーなど、あらゆる事象の結果をYes/No型契約として売買できる日本初の予測市場プラットフォーム",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
