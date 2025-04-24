import { defineConfig } from "drizzle-kit";
import { env } from "#/env";

export default defineConfig({
    out: "./migrations",
    schema: "./src/database/drizzle/schema.ts",
    dialect: "postgresql",
    casing: "snake_case",
    tablesFilter: ["imperia_*"],
    dbCredentials: {
        url: env.POSTGRES_URL
    }
});
