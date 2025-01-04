"use client";
import { animated, config, useSpring } from "@react-spring/web";
import { clsx } from "clsx";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
        <nav className="flex h-full w-[225px] min-w-[225px] flex-col gap-2.5 p-2.5 pe-0">
            <h1
                className={clsx(
                    "justify-center gap-2 text-3xl font-bold",
                    jersey_20.className,
                )}
            >
                {/* <SharkWaterIcon /> */}
                <span className="my-auto leading-0">Stream</span>
            </h1>
            <Link
                href={"/go-live"}
                className={clsx(
                    "rounded-md border-1 border-dashed border-black/20 bg-gray-100 px-4 py-2 text-center text-xl leading-none font-bold text-gray-700 shadow-inner transition-all hover:border-black/50 hover:text-gray-950",
                    jersey_20.className,
                )}
            >
                Go Live
            </Link>
            <div className="flex flex-col gap-2 font-medium text-gray-700">
                <Link
                    href={"/stream"}
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
                {(detached, reatach) => (
                    <VideoPlayer reatach={reatach} detached={detached} />
                )}
            </Pip>
            <div></div>
            <Profile />
        </nav>
    );
}

function VideoPlayer(props: { reatach: () => void; detached: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const streamsQuery = api.streams.allStreams.useQuery();
    useEffect(() => {
        const first = streamsQuery.data?.[0];
        if (!videoRef.current || !first) return;

        const hls = new Hls();
        hls.loadSource(`/backend/stream/${first.id}`);
        hls.attachMedia(videoRef.current);
        window.addEventListener("keyup", (e) => {
            if (e.key === " ") {
                void videoRef.current?.play();
            }
        });
        return () => {
            hls.destroy();
        };
    }, [streamsQuery.data]);

    return (
        <div className="group relative mx-auto overflow-hidden rounded-md border border-black/30">
            <video
                className="aspect-auto h-full w-full"
                ref={videoRef}
                controls={false}
                loop
                autoPlay
            />
            {props.detached && (
                <div className="pointer-events-none absolute top-0 w-full opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        className="pointer-events-auto absolute top-0 right-0 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            props.reatach();
                        }}
                    >
                        <XmarkSmIcon
                            fill="white"
                            height="1.5em"
                            width="1.5em"
                        />
                    </button>
                </div>
            )}
        </div>
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

import { api } from "@/trpc/react";
import { forwardRef, type HTMLProps } from "react";
import { XmarkSmIcon } from "./icons/xmark-sm";

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
const defaultDetachedSize = 298;

type MouseDownType = (typeof MouseDownType)[keyof typeof MouseDownType];
function Pip(props: {
    className?: string;
    children: (
        isAttached: boolean,
        reatach: () => void,
    ) => React.ReactElement<{
        reatach: () => void;
    }>;
}) {
    const [detachedSize, setDetachedSize] = useState(defaultDetachedSize);
    const [detatched, setDetatched] = useState(false);
    const [mouseDown, setMouseDown] = useState<MouseDownType | null>(null);
    const [xy, setXY] = useState<{ x: number; y: number } | null>(null);
    const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
    const pipRef = useRef<HTMLDivElement>(null);

    const [spring, api] = useSpring(
        () => ({
            scale: mouseDown === "DRAG" ? 1.1 : 1,
            config: detatched ? config.stiff : config.wobbly,
        }),
        [mouseDown, detatched],
    );

    const animateBig = useMemo(
        () =>
            (biggness = 1.1) => {
                void api.start({ scale: biggness, config: config.wobbly });
            },
        [api],
    );

    const animateSmall = useMemo(
        () => () => {
            void api.start({ scale: 1, config: config.wobbly });
        },
        [api],
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        const onUnfocus = () => setMouseDown(null);
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
            animateSmall();
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, [mouseDown]);

    function reAttach() {
        setDetatched(false);
        setOffset(null);
        setDetachedSize(defaultDetachedSize);
        setMouseDown(null);
        setXY(null);
        animateBig(1.05);
        setTimeout(animateSmall, 100);
    }

    return (
        <div className={clsx("relative z-[10000000]", props.className, {})}>
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
                    animateBig();
                    setDetatched(true);
                    const boundingRect =
                        pipRef.current?.getBoundingClientRect();
                    if (!boundingRect) return;
                    setOffset({
                        x: e.clientX - boundingRect.left,
                        y: e.clientY - boundingRect.top,
                    });
                }}
                onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                        reAttach();
                    }
                }}
            >
                <animated.div style={spring} className="aspect-auto w-full">
                    {props.children(detatched, reAttach)}
                </animated.div>
                <div
                    className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMouseDown("RESIZE");
                    }}
                ></div>
            </div>
            {detatched && xy && (
                <button
                    className="grid aspect-auto h-[120px] w-full place-items-center rounded-md border border-dashed border-black/20 bg-black/5 text-xs font-bold text-gray-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        reAttach();
                    }}
                >
                    video detached
                </button>
            )}
        </div>
    );
}
