import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import favicon from "@/app/assets/favicon.ico";
import { pretendard } from "./font";
import Header from "@/app/components/header";
import Footer from "@/app/components/footer";
import { assertServerEnv } from "@/app/lib/env";

assertServerEnv();

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
  description: "보다 더 새롭고, 의미있는 경험을 위해",
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
