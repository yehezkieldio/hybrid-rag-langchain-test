# Hybrid RAG Project Onboarding

## 1. Overview

This project implements a Retrieval-Augmented Generation (RAG) system that leverages both vector similarity search and knowledge graph traversal to provide contextually relevant answers to user queries. It uses LangChain to orchestrate the workflow between retrievers and a Large Language Model (LLM).

**Core Technologies:**

*   **Language:** TypeScript
*   **Runtime:** Bun
*   **Orchestration:** LangChain
*   **LLM:** OpenAI (via `@langchain/openai`)
*   **Embeddings:** Hugging Face Inference (via `@huggingface/inference`)
*   **Vector Database:** PostgreSQL with pgVector extension (via Drizzle ORM)
*   **Knowledge Graph:** Neo4j
*   **Containerization:** Docker

## 2. How it Works

1.  **User Input:** The application prompts the user for a question via the command line (`src/index.ts`).
2.  **Hybrid Retrieval:** The input query triggers a parallel retrieval process (`src/retrievers/hybrid-retriever.ts`):
    *   **Vector Search:** Queries the pgVector database for semantically similar document chunks (`src/retrievers/vector-retriever.ts`).
    *   **Knowledge Graph Search:** Queries the Neo4j database for relevant entities and relationships (`src/retrievers/kg-retriever.ts`).
3.  **Context Aggregation:** Results from both retrievers are combined and deduplicated to form a comprehensive context.
4.  **Prompt Engineering:** The aggregated context and the original user question are formatted into a prompt for the LLM (`src/core/rag-chain.ts`). The prompt instructs the LLM (named "Mirae") to answer based *only* on the provided context.
5.  **LLM Invocation:** The prompt is sent to the configured OpenAI model.
6.  **Response Generation:** The LLM generates an answer based on the context.
7.  **Output:** The final answer is displayed to the user.

## 3. Project Structure

```
.
├── docker-compose.yml  # Defines PostgreSQL (w/ pgVector) and Neo4j services
├── drizzle.config.ts   # Drizzle ORM configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── bun.lockb           # Bun lockfile
├── migrations/         # Database migration files (Drizzle)
└── src/
    ├── core/
    │   └── rag-chain.ts    # Defines the main LangChain RAG sequence
    ├── database/
    │   ├── drizzle/      # PostgreSQL/pgVector connection and schema
    │   └── neo4j/        # Neo4j driver and query functions
    ├── embeddings/
    │   └── index.ts      # Embedding model initialization (Hugging Face)
    ├── ingestion/
    │   └── populate.ts   # Script to populate databases with sample data
    ├── llm/
    │   └── index.ts      # LLM (OpenAI) initialization
    ├── retrievers/
    │   ├── hybrid-retriever.ts # Orchestrates vector and KG retrieval
    │   ├── kg-retriever.ts     # Logic for querying Neo4j
    │   └── vector-retriever.ts # Logic for querying pgVector
    ├── env.ts            # Environment variable validation (T3 Env)
    └── index.ts          # Main application entry point (CLI interaction loop)

```

## 4. Setup

1.  **Prerequisites:**
    *   Docker and Docker Compose
    *   Bun (`curl -fsSL https://bun.sh/install | bash`)
    *   Git

2.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd hybrid-rag
    ```

3.  **Environment Variables:**
    *   Create a `.env` file in the project root.
    *   Add the following variables, replacing the placeholder values:
        ```env
        # PostgreSQL/pgVector
        POSTGRES_USER=raguser
        POSTGRES_PASSWORD=ragpassword
        POSTGRES_DB=ragdb
        DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}" # Use localhost if running app locally, or 'db' if running app in Docker

        # Neo4j
        NEO4J_URI="neo4j://localhost:7687" # Use localhost if running app locally, or 'neo4j' if running app in Docker
        NEO4J_USERNAME=neo4j
        NEO4J_PASSWORD=password # Set your desired password here
        NEO4J_AUTH="${NEO4J_USERNAME}/${NEO4J_PASSWORD}" # Used by docker-compose

        # OpenAI
        OPENAI_API_KEY="sk-..."

        # Hugging Face (Optional - if using Inference API for embeddings)
        # HUGGINGFACEHUB_API_KEY="hf_..."
        ```
    *   **Important:** Ensure the `NEO4J_PASSWORD` in your `.env` matches the password part of `NEO4J_AUTH` used in `docker-compose.yml`. Update `docker-compose.yml` if you change the password.

4.  **Start Databases:**
    *   Open a terminal in the project root.
    *   Run: `docker compose up -d`
    *   This will start PostgreSQL (with pgVector) and Neo4j containers in the background. Check logs with `docker compose logs -f`.

5.  **Install Dependencies:**
    *   Run: `bun install`

6.  **Database Migrations (Optional but Recommended):**
    *   If you modify the Drizzle schema (`src/database/drizzle/schema.ts`), generate migrations:
        ```bash
        bun run drizzle-kit generate
        ```
    *   Apply migrations (ensure DB container is running):
        ```bash
        bun run drizzle-kit migrate
        ```
    *   *Note: The `populate.ts` script also ensures the table exists via `vectorStore.ensureTableInDatabase()`, but migrations are better practice for managing schema changes.*

## 5. Running the Application

1.  **Populate Databases (First Time):**
    *   Run the ingestion script to add sample data to both databases:
        ```bash
        bun run src/ingestion/populate.ts
        ```
    *   This script connects to the running Docker containers based on your `.env` settings.

2.  **Start the Chat Interface:**
    *   Run the main application:
        ```bash
        bun run src/index.ts
        ```
    *   The application will initialize the RAG chain and prompt you for input ("You:").

3.  **Interact:**
    *   Type your questions and press Enter.
    *   The assistant ("Mirae") will respond based on the retrieved context.
    *   Type `exit` to gracefully shut down the application and close database connections.

## 6. Data Ingestion Details (`src/ingestion/populate.ts`)

*   **Neo4j:**
    *   Clears any existing data in the graph (`MATCH (n) DETACH DELETE n`).
    *   Creates sample `Person`, `Company`, `Project`, and `Skill` nodes.
    *   Establishes relationships like `WORKS_AT`, `WORKS_ON`, `HAS_SKILL`, `OWNS`.
*   **pgVector:**
    *   Defines sample text documents related to the Neo4j data.
    *   Uses `RecursiveCharacterTextSplitter` to break down texts into smaller chunks.
    *   Generates embeddings for each chunk using the configured embedding model (`src/embeddings/index.ts`).
    *   Stores the chunks, their embeddings, and basic metadata in the `documents` table within the PostgreSQL database using the Drizzle schema (`src/database/drizzle/schema.ts`).
