import type {} from "@redux-devtools/extension"; // required for devtools typing
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

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

interface BearState {
    bears: number;
    increase: (by: number) => void;
}

function getStream() {
    const captureStream = await navigator.mediaDevices.getDisplayMedia(
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
}

const useBearStore = create<BearState>()(
    devtools(
        persist(
            (set) => ({
                bears: 0,
                increase: (by) => set((state) => ({ bears: state.bears + by })),
            }),
            {
                name: "bear-storage",
            },
        ),
    ),
);
