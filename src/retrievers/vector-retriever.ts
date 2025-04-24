import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { pool } from "#/database/drizzle";

export function getVectorStore(embeddings: Embeddings): PGVectorStore {
    const config = {
        pool: pool,
        tableName: "documents",
        columns: {
            idColumnName: "id",
            vectorColumnName: "embedding",
            contentColumnName: "page_content",
            metadataColumnName: "metadata"
        },
        distanceStrategy: "cosine" as const
    };

    return new PGVectorStore(embeddings, config);
}

export async function retrieveVectorContext(query: string, embeddings: Embeddings, k = 4): Promise<Document[]> {
    try {
        const vectorStore = getVectorStore(embeddings);

        const results = await vectorStore.similaritySearch(query, k);
        console.log(`Retrieved ${results.length} documents from vector store.`);
        return results;
    } catch (error) {
        console.error("Error retrieving from vector store:", error);
        return [];
    }
}
