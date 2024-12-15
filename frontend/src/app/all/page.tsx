"use client";

import clsx from "clsx";
import { Jersey_20 } from "next/font/google";
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
    },
    {
        name: "Freya McKee - Blue (Official Video)",
        description: "Blue by Freya McKee",
        id: "m",
        uptime: "2 days",
    },
    {
        name: "Stream One",
        description: "one",
        id: "1",
        uptime: "3.5 hours",
    },
    {
        name: "Stream Two",
        description: "two",
        id: "2",
        uptime: "6 minutes",
    },
];

export default function Home() {
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
                <tbody className="border-spacing-4">
                    {streams.map((stream) => (
                        <tr
                            key={stream.id}
                            className="border-t border-black/10 last:border-b"
                        >
                            <td className="py-3 pe-1">
                                <Checkbox />
                            </td>
                            <td className="py-3 pe-1">{stream.name}</td>
                            <td className="py-3 pe-1">{stream.description}</td>
                            <td className="py-3 pe-1">{stream.uptime}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
