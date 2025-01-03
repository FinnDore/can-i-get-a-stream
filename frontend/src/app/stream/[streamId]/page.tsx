"use client";

import { VideoOffIcon } from "@/app/_components/icons/video-off";
import clsx from "clsx";
import Hls from "hls.js";
import { Jersey_20 } from "next/font/google";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const jersey_20 = Jersey_20({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

export default function Stream() {
    const params = useParams();
    if (!params.streamId || Array.isArray(params.streamId)) {
        return <div>stream not found</div>;
    }
    console.log(params.streamId);
    return (
        <div className="h-full w-full overflow-hidden rounded-md">
            <VideoPlayer streamId={params.streamId} />
        </div>
    );
}

function VideoPlayer(prop: { streamId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!videoRef.current) return;

        const hls = new Hls({
            workerPath: "/hls.worker.js",
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
        <div className="relative h-full w-full bg-black">
            {error && (
                <div className="absolute top-0 left-0 flex h-full w-full max-w-full items-center justify-center gap-3 overflow-hidden text-sm">
                    <VideoOffIcon
                        height="20px"
                        width="20px"
                        secondaryfill="white"
                        fill="white"
                    />
                    <div
                        className={clsx(
                            "z-10 text-xl text-nowrap text-white",
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
                    controls
                    ref={videoRef}
                    className="relative h-full w-full content-center object-contain"
                />
            )}
        </div>
    );
}
