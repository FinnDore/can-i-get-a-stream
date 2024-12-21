"use client";

import { useSpring } from "@react-spring/web";
import clsx from "clsx";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import { useEffect, useRef, useState } from "react";
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
        height: 1280,
        width: 720,
    },
    {
        name: "Freya McKee - Blue (Official Video)",
        description: "Blue by Freya McKee",
        id: "m",
        uptime: "2 days",
        height: 2880,
        width: 2160,
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

    const activeStream = streams.find((s) => s.id === hoveredRow);

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
                setPosition(null);
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
        if (!tBodyRef.current || !spaceDown) return;

        const onMouseMove = (e: MouseEvent) => {
            if (!tBodyRef.current) return;
            const boundingRect = tBodyRef.current.getBoundingClientRect();
            setPosition({
                x: e.clientX - boundingRect.left / 2,
                y: e.clientY - boundingRect.top / 1.5,
            });
        };

        window.addEventListener("mousemove", onMouseMove);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, [spaceDown]);

    const arcSpring = useSpring(() => ({}), [activeStream]);

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
                className={clsx("pointer-events-none fixed")}
                animate={{
                    aspectRatio: activeStream
                        ? `${activeStream.height}/${activeStream.width}`
                        : "auto",

                    width: Math.max(
                        Math.min((activeStream?.width ?? 1) / 3, 320),
                        420,
                    ),
                }}
                transition={{ type: "spring", damping: 12, bounce: 120 }}
                style={{
                    top: position?.y,
                    left: position?.x,
                }}
            >
                <Arc
                    hidden={!spaceDown || !position}
                    className="pointer-events-none h-full w-full"
                >
                    <VideoPlayer streamId={hoveredRow ?? "cam"} />
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
                    {streams.map((stream, i) => (
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
            ref={videoRef}
            controls={false}
            className="relative h-full w-full content-center object-contain"
        />
    );
}
