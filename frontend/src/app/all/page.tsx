"use client";

import { api } from "@/trpc/react";
import clsx from "clsx";
import { intlFormat } from "date-fns";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arc } from "../_components/arc";
import { Checkbox } from "../_components/checkbox";
import { VideoOffIcon } from "../_components/icons/video-off";
import { Elapased } from "../_components/since";
import { ToolTip } from "../_components/tooltip";

const jersey_20 = Jersey_20({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

export default function Home() {
    const streamsQuery = api.streams.allStreams.useQuery();

    const [spaceDown, setSpaceDown] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const tBodyRef = useRef<HTMLTableSectionElement>(null);
    const pipRef = useRef<HTMLDivElement>(null);

    const [widthHight, activeStream] = useMemo(() => {
        const stream = streamsQuery.data?.find((s) => s.id === hoveredRow);
        if (!stream) return [null, null];
        const width = Math.min(Math.max(stream.width / 4, 320), 420);
        const height = width / (stream.width / stream.height);

        return [
            {
                width,
                height,
            } as const,
            stream,
        ];
    }, [hoveredRow, streamsQuery.data]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === " " && !e.repeat) {
                setSpaceDown(true);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === " ") {
                setSpaceDown(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    useEffect(() => {
        if (spaceDown && activeStream) {
            document.body.classList.add("cursor-none");
        } else {
            document.body.classList.remove("cursor-none");
        }
    }, [activeStream, spaceDown]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!pipRef.current) return;
            pipRef.current.style.top = `${e.clientY}px`;
            pipRef.current.style.left = `${e.clientX}px`;
        };

        window.addEventListener("mousemove", onMouseMove);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, []);

    return (
        <div className="h-full w-full p-4 px-6">
            <div className="mb-4 flex w-full justify-between">
                <h1 className={clsx("text-2xl font-bold", jersey_20.className)}>
                    All Streams
                </h1>
                <button className="pointer cursor-pointer rounded-md bg-black px-2.5 py-1 text-white">
                    Add Stream
                </button>
            </div>
            <motion.div
                className={clsx("pointer-events-none fixed will-change-auto", {
                    hidden: !spaceDown || !activeStream,
                })}
                animate={{
                    width: widthHight?.width ?? 0,
                    height: widthHight?.height ?? 0,
                    transform: `translate(-${(widthHight?.width ?? 1) / 2}px, -${(widthHight?.height ?? 1) / 2}px)`,
                }}
                transition={{
                    type: "spring",
                    damping: 12,
                    bounce: 120,
                    velocity: 120,
                }}
                ref={pipRef}
            >
                <Arc className="pointer-events-none h-full min-h-full">
                    {streamsQuery.data?.map((stream) => (
                        <div
                            key={stream.id}
                            className={clsx("top-0 left-0", {
                                hidden: activeStream?.id !== stream.id,
                                absolute: activeStream?.id !== stream.id,
                            })}
                        >
                            <VideoPlayer streamId={stream.id} />
                        </div>
                    ))}
                </Arc>
            </motion.div>
            <table className="w-full">
                <thead className="text-left text-sm text-gray-700">
                    <tr>
                        <th className="pb-2 font-normal">
                            <Checkbox />
                        </th>
                        <th className="pb-2 font-normal">Name</th>
                        <th className="pb-2 font-normal">Description</th>
                        <th className="pb-2 font-normal">Uptime</th>
                    </tr>
                </thead>
                <tbody className="border-spacing-4" ref={tBodyRef}>
                    {streamsQuery.data?.map((stream) => (
                        <tr
                            key={stream.id}
                            className="border-t border-black/10 last:border-b hover:bg-gray-50"
                            onMouseEnter={() => setHoveredRow(stream.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            data-stream-id={stream.id}
                        >
                            <td className="w-0 py-3 pe-3">
                                <Checkbox />
                            </td>
                            <td className="max-w-34 py-3 pe-1">
                                {stream.name}
                            </td>
                            <td className="py-3 pe-1">{stream.description}</td>
                            <td className="py-3 pe-1">
                                <ToolTip
                                    tooltip={intlFormat(stream.startTime, {
                                        year: "2-digit",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        formatMatcher: "basic",
                                    })}
                                >
                                    <span>
                                        <Elapased date={stream.startTime} />
                                    </span>
                                </ToolTip>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function VideoPlayer(prop: { streamId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!videoRef.current) return;

        const hls = new Hls({
            workerPath: "hls.worker.js",
            enableWorker: true,
        });

        hls.loadSource(`http://localhost:3001/stream/${prop.streamId}`);
        hls.on(Hls.Events.ERROR, (e, a) => {
            console.log(e, a);
            setError(true);
        });

        hls.attachMedia(videoRef.current);
        window.addEventListener("keyup", (e) => {
            if (e.key === " ") {
                void videoRef.current?.play();
            }
        });

        return () => {
            hls.destroy();
        };
    }, [prop.streamId]);

    return (
        <>
            {error && (
                <div className="absolute top-0 left-0 flex h-full w-full max-w-full items-center justify-center gap-3 overflow-hidden text-sm">
                    <VideoOffIcon
                        height="20px"
                        width="20px"
                        secondaryfill="white"
                        fill="#030712"
                    />
                    <div
                        className={clsx(
                            "z-10 text-xl text-nowrap text-gray-950",
                            jersey_20.className,
                        )}
                    >
                        Error loading stream
                    </div>
                </div>
            )}
            {!error && (
                <video
                    muted
                    autoPlay
                    loop
                    ref={videoRef}
                    controls={false}
                    className="relative h-full w-full content-center object-contain"
                />
            )}
        </>
    );
}
