import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import favicon from "@/app/assets/favicon.ico";
import { pretendard } from "./font";
import Header from "@/app/components/header";
import Footer from "@/app/components/footer";

const geistSans = Geist({
  variable: "--fonts-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--fonts-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OG Server",
  description: "새로운 경험을 겪어보세요",
  icons: {
    icon: favicon.src,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="ko">
      <body className={`${pretendard.variable} ${geistSans.variable} ${geistMono.variable} `}>
        <Header/>
        {children}
        <Footer/>
      </body>
      </html>
  );
}
