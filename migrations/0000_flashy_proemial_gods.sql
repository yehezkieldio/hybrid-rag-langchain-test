CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_content" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
