import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "#/env";
import * as schema from "./schema";

export const pool = new Pool({
    connectionString: env.POSTGRES_URL
});

export const db = drizzle(pool, { schema });

export async function findSimilarDocuments(embedding: number[], limit = 4) {
    const embeddingString = `[${embedding.join(",")}]`;
    const query = `
    SELECT page_content as "pageContent", metadata, 1 - (embedding <=> $1::vector) as similarity
    FROM documents
    ORDER BY embedding <=> $1::vector
    LIMIT $2;
  `;
    try {
        const result = await pool.query(query, [embeddingString, limit]);
        return result.rows;
    } catch (error) {
        console.error("Error performing vector search:", error);
        return [];
    }
}
