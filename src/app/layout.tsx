import type { Metadata, Viewport } from "next";
import { Syncopate, Space_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";
import { GameProvider } from "@/lib/GameContext";

const syncopate = Syncopate({
  variable: "--font-syncopate",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "我是 IKUN，黑子来战",
  description: "我是 IKUN，黑子来战 - The Ultimate Showdown",
  applicationName: "我是 IKUN，黑子来战",
  appleWebApp: {
    title: "我是 IKUN，黑子来战",
  },
  openGraph: {
    title: "我是 IKUN，黑子来战",
    siteName: "我是 IKUN，黑子来战",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${syncopate.variable} ${spaceMono.variable} antialiased`}
      >
        <LanguageProvider>
          <GameProvider>{children}</GameProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
