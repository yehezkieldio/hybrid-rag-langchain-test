import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
    server: {
        NODE_ENV: z.enum(["development", "production"]),
        OPENROUTER_API_KEY: z.string(),
        OPENROUTER_BASE_URL: z.string().url(),
        OPENROUTER_LLM_MODEL: z.string(),
        HF_API_TOKEN: z.string(),
        EMBEDDING_MODEL_NAME: z.string(),
        POSTGRES_URL: z.string(),
        POSTGRES_USER: z.string(),
        POSTGRES_PASSWORD: z.string(),
        NEO4J_URI: z.string(),
        NEO4J_AUTH: z.string(),
        NEO4J_USERNAME: z.string(),
        NEO4J_PASSWORD: z.string()
    },
    runtimeEnv: process.env
});
