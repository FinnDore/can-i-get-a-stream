"use client";
import { clsx } from "clsx";
import { Jersey_20 } from "next/font/google";
import SharkWater from "./icons/shark-water";

// If loading a variable font, you don't need to specify the font weight
const jersey_20 = Jersey_20({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export function Nav() {
  return (
    <nav className="h-full w-[225px] min-w-[225px] p-2.5">
      <h1
        className={clsx("flex gap-2 text-3xl font-bold", jersey_20.className)}
      >
        <SharkWater />
        <span className="my-auto leading-0">Stream</span>
      </h1>
    </nav>
  );
}
