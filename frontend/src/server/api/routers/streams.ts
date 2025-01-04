import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const baseUrl = "https://localhost:3001";

const streamsSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    startTime: z.string().pipe(z.coerce.date({})),
    width: z.number(),
    height: z.number(),
});

export const streamsRouter = createTRPCRouter({
    allStreams: publicProcedure.query(async ({}) => {
        return fetch(`${baseUrl}/streams`)
            .then((res) => res.json())
            .then((res) => streamsSchema.array().parse(res))
            .catch((e) => {
                console.error(e);
                throw new Error("Failed to fetch streams");
            });
    }),
    deleteStream: publicProcedure
        .input(
            z.object({
                id: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            return fetch(`${baseUrl}/stream/${input.id}`, {
                method: "DELETE",
            }).then((res) => {
                if (!res.ok) {
                    console.error(
                        "Failed to delete stream",
                        res.status,
                        res.statusText,
                        res,
                    );
                    throw new Error("Failed to delete stream");
                }
            });
        }),
});
