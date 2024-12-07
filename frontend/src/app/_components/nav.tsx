"use client";
import { clsx } from "clsx";
import { Jersey_20 } from "next/font/google";
import Link from "next/link";
import { GearIcon } from "./icons/gear";
import { ViewAllIcon } from "./icons/view-all";

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
        className={clsx(
          "flexl mb-3 justify-center gap-2 text-3xl font-bold",
          jersey_20.className,
        )}
      >
        {/* <SharkWaterIcon /> */}
        <span className="my-auto leading-0">Stream</span>
      </h1>
      <div className="flex flex-col gap-2 font-medium text-gray-700">
        <Link
          href={"/all"}
          className="flex cursor-pointer gap-2 hover:text-black"
        >
          <ViewAllIcon />
          <span className="my-auto leading-0">All Streams</span>
        </Link>
        <Link
          href={"/settings"}
          className="flex cursor-pointer gap-2 hover:text-black"
        >
          <GearIcon />
          <span className="my-auto leading-0">Settings</span>
        </Link>
      </div>

      <div></div>
    </nav>
  );
}
