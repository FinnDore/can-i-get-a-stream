"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arc } from "../_components/arc";
import { Checkbox } from "../_components/checkbox";

const jersey_20 = Jersey_20({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});
const streams = [
    {
        name: "Living Room",
        description: "A room with a couch and a TV",
        id: "cam",
        uptime: "1 month",
        viewers: [
            {
                name: "Finn",
                img: "/finn.gif",
            },
        ],
        height: 720,
        width: 1280,
    },
    {
        name: "Freya McKee - Blue (Official Video)",
        description: "Blue by Freya McKee",
        id: "m",
        uptime: "2 days",
        height: 2160,
        width: 2880,
    },
    {
        name: "Finals",
        description: "top 500 gameplay",
        id: "game",
        uptime: "1 day",
        height: 960,
        width: 1280,
    },
    {
        name: "Minisota",
        description: "Minisota by glaive",
        id: "81d3158d-1d13-4410-a3ea-eb97294744ae",
        uptime: "3 mins",
        width: 1920,
        height: 1080,
    },
    {
        name: "wide Finals",
        description: "top 500 gameplay but wide",
        id: "wide",
        uptime: "1 day",
        height: 360,
        width: 1280,
    },

    // {
    //     name: "Stream One",
    //     description: "one",
    //     id: "bbb",
    //     uptime: "3.5 hours",
    // },
    // {
    //     name: "Stream Two",
    //     description: "two",
    //     id: "f",
    //     uptime: "6 minutes",
    // },
];

export default function Home() {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(
        null,
    );
    const [spaceDown, setSpaceDown] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const tBodyRef = useRef<HTMLTableSectionElement>(null);

    const [widthHight, activeStream] = useMemo(() => {
        const stream = streams.find((s) => s.id === hoveredRow);
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
    }, [hoveredRow]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === " " && !e.repeat) {
                document.body.classList.add("cursor-none");
                setSpaceDown(true);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === " ") {
                document.body.classList.remove("cursor-none");
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
        const onMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX,
                y: e.clientY,
            });
        };

        window.addEventListener("mousemove", onMouseMove);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, [setPosition]);

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
                className={clsx("pointer-events-none fixed", {
                    hidden: !spaceDown || !position || !activeStream,
                })}
                animate={{
                    width: widthHight?.width,
                    height: widthHight?.height,
                    transform: `translate(-${(widthHight?.width ?? 1) / 2}px, -${(widthHight?.height ?? 1) / 2}px)`,
                }}
                transition={{
                    type: "spring",
                    damping: 12,
                    bounce: 120,
                    velocity: 120,
                }}
                style={{
                    top: position?.y,
                    left: position?.x,
                }}
            >
                <Arc className="pointer-events-none min-h-full min-w-full">
                    <div
                        className={clsx("top-0 left-0 h-full w-full", {
                            hidden: activeStream?.id !== "cam",
                            absolute: activeStream?.id !== "cam",
                        })}
                    >
                        <VideoPlayer streamId={"cam"} />
                    </div>
                    <div
                        className={clsx("top-0 left-0 h-full w-full", {
                            hidden: activeStream?.id !== "m",
                            absolute: activeStream?.id !== "m",
                        })}
                    >
                        <VideoPlayer streamId={"m"} />
                    </div>
                    <div
                        className={clsx("top-0 left-0 h-full w-full", {
                            hidden: activeStream?.id !== "game",
                            absolute: activeStream?.id !== "game",
                        })}
                    >
                        <VideoPlayer streamId={"game"} />
                    </div>
                    <div
                        className={clsx("top-0 left-0 h-full w-full", {
                            hidden: activeStream?.id !== "wide",
                            absolute: activeStream?.id !== "wide",
                        })}
                    >
                        <VideoPlayer streamId={"wide"} />
                    </div>
                    <div
                        className={clsx("top-0 left-0 h-full w-full", {
                            hidden:
                                activeStream?.id !==
                                "81d3158d-1d13-4410-a3ea-eb97294744ae",
                            absolute:
                                activeStream?.id !==
                                "81d3158d-1d13-4410-a3ea-eb97294744ae",
                        })}
                    >
                        <VideoPlayer
                            streamId={"81d3158d-1d13-4410-a3ea-eb97294744ae"}
                        />
                    </div>
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
                    {streams.map((stream) => (
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
                            <td className="py-3 pe-1">{stream.uptime}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function VideoPlayer(prop: { streamId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const hls = new Hls();

        hls.loadSource(`http://localhost:3001/stream/${prop.streamId}`);
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
        <video
            muted
            autoPlay
            loop
            ref={videoRef}
            controls={false}
            className="relative h-full w-full content-center object-contain"
        />
    );
}
