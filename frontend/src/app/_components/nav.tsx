"use client";
import { animated, config, useSpring } from "@react-spring/web";
import { clsx } from "clsx";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

      <Pip className="mt-auto flex w-full items-center justify-center">
        <VideoPlayer />
      </Pip>
      <div></div>
      <Profile />
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
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      // setTimeout(() => void videoRef.current?.play(), 1000);
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === " ") {
        void videoRef.current?.play();
      }
    });
  }, []);

  return (
    <video
      autoPlay
      ref={videoRef}
      className="mx-auto aspect-auto w-full rounded-md border border-black/30"
      controls={false}
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

const MouseDownType = {
  RESIZE: "RESIZE",
  DRAG: "DRAG",
} as const;

type MouseDownType = (typeof MouseDownType)[keyof typeof MouseDownType];
function Pip(props: { className?: string; children: React.ReactNode }) {
  const [detachedSize, setDetachedSize] = useState(300);
  const [detatched, setDetatched] = useState(false);
  const [mouseDown, setMouseDown] = useState<MouseDownType | null>(null);
  const [xy, setXY] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const spring = useSpring({
    scale: mouseDown === "DRAG" ? 1.1 : 1,
    config: detatched ? config.stiff : config.wobbly,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUnfocus = () => setMouseDown(false);
    window.addEventListener("mouseup", onUnfocus);

    return () => {
      window.removeEventListener("mouseup", onUnfocus);
    };
  }, []);

  useEffect(() => {
    if (!mouseDown) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!pipRef.current || !window) return;

      if (mouseDown === "RESIZE") {
        const boundingRect = pipRef.current.getBoundingClientRect();
        setDetachedSize(Math.max(e.clientX - boundingRect.left, 150));
        return;
      } else if (mouseDown === "DRAG") {
        const x = Math.max(e.clientX - (offset?.x ?? 0), 0);
        const y = Math.max(e.clientY - (offset?.y ?? 0), 0);
        setXY({ x, y });
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [mouseDown]);

  return (
    <div className={clsx("relative", props.className, {})}>
      <div
        style={{
          position: detatched && xy ? "fixed" : "relative",
          left: detatched && xy ? xy.x : 0,
          top: detatched && xy ? xy.y : 0,
          width: detatched ? `${detachedSize}px` : undefined,
        }}
        ref={pipRef}
        onMouseDown={(e) => {
          setMouseDown("DRAG");
          setDetatched(true);
          const boundingRect = pipRef.current?.getBoundingClientRect();
          if (!boundingRect) return;
          setOffset({
            x: e.clientX - boundingRect.left,
            y: e.clientY - boundingRect.top,
          });
        }}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) {
            setDetachedSize(300);
            setDetatched(false);
            setOffset(null);
            setXY(null);
          }
        }}
      >
        <animated.div style={spring} className="aspect-auto w-full">
          {props.children}
        </animated.div>
        <div
          className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMouseDown("RESIZE");
          }}
        ></div>
      </div>
      {detatched && xy && (
        <div
          className="grid aspect-auto h-[120px] w-full place-items-center rounded-md border border-dashed border-black/20 bg-black/5 text-xs font-bold text-gray-400"
          onClick={(e) => {
            e.stopPropagation();
            setDetatched(false);
          }}
        >
          video detached
        </div>
      )}
    </div>
  );
}
