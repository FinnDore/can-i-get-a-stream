/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: "/backend/stream/:streamId",
                    destination: `${env.BACKEND_URL}/stream/:streamId`,
                },
                {
                    source: "/backend/segment/:streamId/:segmentId",
                    destination: `${env.BACKEND_URL}/segment/:streamId/:segmentId`,
                },
                {
                    source: "/backend/stream/:streamId",
                    destination: `${env.BACKEND_URL}/stream/:streamId`,
                },
            ],
            afterFiles: [],
            fallback: [],
        };
    },
};

export default config;
