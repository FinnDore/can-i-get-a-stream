"use client";

import { api } from "@/trpc/react";
import clsx from "clsx";
import { intlFormat } from "date-fns";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import Link from "next/link";
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
    const utils = api.useUtils();
    const streamsQuery = api.streams.allStreams.useQuery();
    const deleteStreamsMutation = api.streams.deleteStream.useMutation({
        onSettled: (_, __, input) => {
            utils.streams.allStreams.setQueriesData(undefined, {}, (curr) => {
                return curr?.filter((s) => s.id !== input.id);
            });
            setSelectedStreams((curr) => curr?.filter((s) => s !== input.id));
            void streamsQuery.refetch();
        },
    });

    const [spaceDown, setSpaceDown] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const tBodyRef = useRef<HTMLTableSectionElement>(null);
    const pipRef = useRef<HTMLDivElement>(null);
    const [selectedStreams, setSelectedStreams] = useState<string[]>([]);

    const [widthHight, activeStream, sliceToRender] = useMemo(() => {
        if (!streamsQuery.data) return [null, null, null];
        const index = streamsQuery.data?.findIndex((s) => s.id === hoveredRow);
        if (typeof index === "undefined") return [null, null, null];
        const stream = streamsQuery.data?.[index];
        if (!stream) return [null, null, null];

        let width = Math.min(Math.max(stream.width / 4, 520), 520);
        let height = width / (stream.width / stream.height);

        while (height > 620) {
            height -= 10;
            width -= 10;
        }
        const padding = spaceDown ? 2 : 0;
        const start = Math.max(0, index - padding);
        // + 1 beacuse this includes the active stream
        const end = Math.min(streamsQuery.data.length, index + padding + 1);
        const sliceToRender = streamsQuery.data
            ?.slice(start, index)
            .concat(streamsQuery.data?.slice(index, end));

        return [
            {
                width,
                height,
            } as const,
            stream,
            sliceToRender,
        ];
    }, [hoveredRow, streamsQuery.data, spaceDown]);

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
            if (!pipRef.current || !widthHight) return;

            const padding = 12;
            const yOverflow = e.clientY - padding - widthHight.height / 2;
            if (yOverflow < 0) {
                pipRef.current.style.top = `${e.clientY + Math.abs(yOverflow)}px`;
            } else {
                pipRef.current.style.top = `${e.clientY}px`;
            }
            pipRef.current.style.left = `${e.clientX}px`;
        };

        window.addEventListener("mousemove", onMouseMove);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, [widthHight]);

    return (
        <div className="h-full w-full p-4 px-6">
            <div className="mb-4 flex w-full justify-between gap-4">
                <h1 className={clsx("text-2xl font-bold", jersey_20.className)}>
                    All Streams
                </h1>
                {selectedStreams.length > 0 && (
                    <button
                        className="pointer ms-auto cursor-pointer rounded-md bg-red-600 px-2.5 py-1 text-white"
                        onClick={() => {
                            for (const stream of selectedStreams) {
                                deleteStreamsMutation.mutate({
                                    id: stream,
                                });
                            }
                        }}
                    >
                        Delete Stream{selectedStreams.length > 1 ? "s" : ""}
                    </button>
                )}

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
                    {sliceToRender?.map((stream) => (
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
                            <Checkbox
                                onClick={() => {
                                    if (selectedStreams.length === 0) {
                                        setSelectedStreams(
                                            streamsQuery?.data?.map(
                                                (s) => s.id,
                                            ) ?? [],
                                        );
                                        return;
                                    } else {
                                        setSelectedStreams([]);
                                    }
                                }}
                                checked={
                                    !!(
                                        streamsQuery.data?.length &&
                                        selectedStreams.length > 0 &&
                                        selectedStreams.length ===
                                            selectedStreams?.length
                                    )
                                }
                            />
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
                            onClick={(e) => {
                                if (!e.ctrlKey && !e.metaKey) return;

                                setSelectedStreams(
                                    selectedStreams.includes(stream.id)
                                        ? selectedStreams.filter(
                                              (s) => s !== stream.id,
                                          )
                                        : [...selectedStreams, stream.id],
                                );
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }}
                        >
                            <td className="w-0 py-3 pe-3">
                                <Checkbox
                                    onClick={() => {
                                        setSelectedStreams(
                                            selectedStreams.includes(stream.id)
                                                ? selectedStreams.filter(
                                                      (s) => s !== stream.id,
                                                  )
                                                : [
                                                      ...selectedStreams,
                                                      stream.id,
                                                  ],
                                        );
                                    }}
                                    checked={selectedStreams.includes(
                                        stream.id,
                                    )}
                                />
                            </td>
                            <td className="max-w-34">
                                <Link
                                    href={`/stream/${stream.id}`}
                                    className="block w-full py-3 pe-3"
                                >
                                    {stream.name}
                                </Link>
                            </td>
                            <td>
                                <Link
                                    href={`/stream/${stream.id}`}
                                    className="block w-full py-3 pe-3"
                                >
                                    {stream.description}
                                </Link>
                            </td>
                            <td>
                                <Link
                                    href={`/stream/${stream.id}`}
                                    className="block w-full py-3 pe-3"
                                >
                                    <ToolTip
                                        enabled={!activeStream && !spaceDown}
                                        tooltip={intlFormat(stream.startTime, {
                                            dateStyle: "medium",
                                            timeStyle: "long",
                                        })}
                                    >
                                        <span>
                                            <Elapased date={stream.startTime} />
                                        </span>
                                    </ToolTip>
                                </Link>
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
            lowLatencyMode: true,
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
