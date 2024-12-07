"use client";
import { clsx } from "clsx";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import Link from "next/link";
import { useEffect, useRef } from "react";
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
    <nav className="flex h-full w-[225px] min-w-[225px] flex-col p-2.5 pe-0">
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

      <div className="mt-auto flex w-full items-center justify-center">
        <VideoPlayer />
      </div>
      <div>
        <Profile />
      </div>
    </nav>
  );
}

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const hls = new Hls();
    hls.loadSource("http://localhost:3001/stream/cam");
    hls.attachMedia(videoRef.current);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {});
  }, []);

  return (
    <video
      ref={videoRef}
      className="mx-auto aspect-auto w-full rounded-md border border-black/30"
      controls={false}
      onClick={(e) => {
        e.target.paused ? e.target.play() : e.target.pause();
      }}
    />
  );
}

function Profile() {
  return (
    <div className="mt-4 flex w-full gap-2">
      <Pfp name="Finn" image="/finn.gif" className="h-9 w-9" />
      <div className="my-auto leading-none">
        <div className="font-bold">Finn</div>
        <div className="text-xs">finn@gmail.com</div>
      </div>
    </div>
  );
}

import { forwardRef, type HTMLProps } from "react";

export const Pfp = forwardRef<
  HTMLDivElement,
  HTMLProps<HTMLDivElement> & {
    name?: string | null | undefined;
    border?: string;
    image: string;
  }
>(function Pfp({ name, border, image, ...props }, ref) {
  return (
    <div
      ref={ref}
      {...props}
      className={clsx("aspect-square", props.className)}
    >
      <div className="relative h-full w-full cursor-pointer">
        <div
          className={clsx(
            border,
            "absolute z-10 h-full w-full overflow-clip rounded-full border border-black/20",
          )}
        >
          <picture className="block h-[70px] min-h-full w-[70px] min-w-full overflow-clip">
            <source srcSet={"/NOISE.webp"} type="image/webp" />
            <img
              alt={`profile picture for ${name ?? "a user"}`}
              className="aspect-square min-h-full"
            />
          </picture>
        </div>

        <div className="absolute block h-full w-full overflow-clip rounded-full saturate-150">
          <picture className="">
            <source suppressHydrationWarning srcSet={image} />
            <img
              className="h-full w-full"
              alt={`profile picture for ${name ?? "a user"}`}
            />
          </picture>
        </div>
      </div>
    </div>
  );
});
