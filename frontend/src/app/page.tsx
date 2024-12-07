"use client";

import { Nav } from "./_components/nav";

export default function Home() {
  return (
    <div className="flex h-screen min-h-screen bg-red-50">
      <Nav />
      <div className="w-full p-2.5">
        <main className="h-full w-full flex-col items-center justify-center rounded-md border border-black/15 bg-white dark:text-white"></main>
      </div>
    </div>
  );
}
