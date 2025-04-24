import { pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    pageContent: text("page_content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow()
});
