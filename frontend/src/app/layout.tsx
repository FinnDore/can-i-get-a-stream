"use client";
import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";

import { TRPCReactProvider } from "@/trpc/react";
import { Nav } from "./_components/nav";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>
          <div className="flex h-screen min-h-screen bg-red-50 text-black">
            <Nav />
            <div className="w-full p-2.5">
              <main className="h-full w-full flex-col items-center justify-center rounded-md border border-black/15 bg-white">
                {children}
              </main>
            </div>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
