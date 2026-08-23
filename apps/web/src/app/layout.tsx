import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { getToken } from "@/lib/auth-server";
import { Providers } from "./providers";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "App",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const initialToken = await getToken();

  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers initialToken={initialToken}>{children}</Providers>
      </body>
    </html>
  );
}
