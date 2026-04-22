import type { Metadata } from "next";
import "nes.css/css/nes.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridironHunters",
  description: "Early fantasy football workspace powered by Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
