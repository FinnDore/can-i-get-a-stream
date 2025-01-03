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
                "flex h-full w-full flex-col items-center justify-center gap-4 p-4",
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
                        query.append("name", "test");
                        query.append("description", "test");
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

                        void fetch(
                            `http://localhost:3001/upload?${query.toString()}`,
                            {
                                method: "POST",
                                // @ts-expect-error idk
                                duplex: "half",
                                body: mediaStreamToReadableStream(
                                    captureStream,
                                ),
                                allowHTTP1ForStreamingUpload: true,
                            },
                        ).catch((e) => {
                            console.error(e);
                            setMediaStream(null);
                        });
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
        start(ctrl) {
            const recorder = new MediaRecorder(mediaStream);
            recorder.ondataavailable = async (e) => {
                ctrl.enqueue(new Uint8Array(await e.data.arrayBuffer()));
            };
            recorder.start(timeslice);
        },
    });
}
