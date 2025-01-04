"use client";
import clsx from "clsx";
import { Jersey_20 } from "next/font/google";
import { useRef, useState } from "react";

const jersey_20 = Jersey_20({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

const options = {
    video: {
        displaySurface: "browser",
    },
    audio: {
        suppressLocalAudioPlayback: false,
    },
    preferCurrentTab: false,
    selfBrowserSurface: "exclude",
    systemAudio: "include",
    surfaceSwitching: "include",
    monitorTypeSurfaces: "include",
} as const;

export default function GoLive() {
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const video = useRef<HTMLVideoElement | null>(null);
    return (
        <div
            className={clsx(
                "flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-md p-4",
                {
                    "bg-black": mediaStream,
                },
            )}
        >
            {!mediaStream && (
                <button
                    className={clsx(
                        "cursor-pointer rounded-md border-1 border-dashed border-black/20 bg-gray-100 px-4 py-2 text-center text-xl leading-none font-bold text-gray-700 shadow-inner transition-all hover:border-black/50 hover:text-gray-950",
                        jersey_20.className,
                    )}
                    onClick={async () => {
                        const captureStream =
                            await navigator.mediaDevices.getDisplayMedia(
                                options as unknown as DisplayMediaStreamOptions,
                            );

                        const query = new URLSearchParams();
                        query.append("stream_name", "test");
                        query.append("stream_description", "test");
                        query.append(
                            "width",
                            `${captureStream.getVideoTracks()[0]?.getSettings().width}`,
                        );
                        query.append(
                            "height",
                            `${captureStream.getVideoTracks()[0]?.getSettings().height}`,
                        );
                        const track = captureStream.getVideoTracks()[0];

                        console.log(track, video);
                        if (!track) return;
                        if (!video.current) return;

                        video.current.srcObject = captureStream;
                        setMediaStream(captureStream);

                        const ws = new WebSocket(
                            `ws://localhost:3001/upload/ws?${query.toString()}`,
                        );
                        ws.onopen = () => {
                            console.log("ws connected");
                        };
                        ws.onmessage = (e) => {
                            console.log(e);
                        };

                        const recorder = new MediaRecorder(captureStream);
                        recorder.ondataavailable = async (e) => {
                            ws.send(e.data);
                        };
                        recorder.start(100);
                        ws.onclose = () => {
                            recorder.stop();
                            console.log("ws closed");
                        };
                    }}
                >
                    Go Live
                </button>
            )}
            {
                <video
                    autoPlay
                    muted
                    ref={video}
                    className={clsx("h-full w-full", { hidden: !mediaStream })}
                />
            }
        </div>
    );
}

function mediaStreamToReadableStream(
    mediaStream: MediaStream,
    timeslice = 100,
) {
    return new ReadableStream({
        start(ctrl) {},
    });
}
