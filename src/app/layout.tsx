import type { Metadata, Viewport } from "next";
import { Syncopate, Space_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";

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
  title: "我是IKUN，黑粉来战",
  description: "我是IKUN，黑粉来战 - The Ultimate Showdown",
  applicationName: "我是IKUN，黑粉来战",
  appleWebApp: {
    title: "我是IKUN，黑粉来战",
  },
  openGraph: {
    title: "我是IKUN，黑粉来战",
    siteName: "我是IKUN，黑粉来战",
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
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
