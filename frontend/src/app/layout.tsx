import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IncidentMind - CoralOps",
  description: "AI Operational Causality Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased bg-[#050505] text-neutral-200`}
    >
      <body className="h-full flex overflow-hidden bg-[#050505]">
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden flex flex-col relative">
          {children}
        </main>
      </body>
    </html>
  );
}
